import { faker } from "@faker-js/faker";
import { Factory } from "@farcaster/fishery";
import { ed25519 } from "@noble/curves/ed25519";
import { blake3 } from "@noble/hashes/blake3";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "@noble/hashes/utils";
import * as protobufs from "./protobufs";
import {
  IdRegisterEventBody,
  IdRegisterEventType,
  IdRegisterOnChainEvent,
  OnChainEventType,
  Protocol,
  SignerEventBody,
  SignerEventType,
  SignerMigratedEventBody,
  SignerMigratedOnChainEvent,
  SignerOnChainEvent,
  StorageRentEventBody,
  StorageRentOnChainEvent,
  UserNameType,
} from "./protobufs";
import { base58ToBytes, bytesToBase58, bytesToHexString, utf8StringToBytes } from "./bytes";
import { Ed25519Signer, Eip712Signer, NobleEd25519Signer, Signer, ViemLocalEip712Signer } from "./signers";
import { FARCASTER_EPOCH, getFarcasterTime, toFarcasterTime } from "./time";
import {
  recreateSolanaClaimMessage,
  VerificationAddressClaimEthereum,
  VerificationAddressClaimSolana,
} from "./verifications";
import { bytesToHex, hexToBytes, isHex, LocalAccount } from "viem";
import { toBigInt } from "ethers";

/** Scalars */

const FidFactory = Factory.define<number>(() => {
  return faker.datatype.number({ min: 1 });
});

const BytesFactory = Factory.define<Uint8Array, { length?: number }>(({ transientParams }) => {
  const length = transientParams.length ?? faker.datatype.number({ max: 64, min: 1 });
  return randomBytes(length);
});

const MessageHashFactory = Factory.define<Uint8Array>(() => {
  return BytesFactory.build({}, { transient: { length: 20 } }); // 160 bits
});

const FnameFactory = Factory.define<Uint8Array>(() => {
  const length = faker.datatype.number({ min: 1, max: 16 });
  const bytes = new Uint8Array(length);

  //  The name begins with [a-z 0-9] or the ascii numbers [48-57, 97-122] inclusive
  bytes.set(
    [
      faker.helpers.arrayElement([
        faker.datatype.number({ min: 48, max: 57 }),
        faker.datatype.number({ min: 97, max: 122 }),
      ]),
    ],
    0,
  );

  // The name can contain [a-z 0-9 -] or the ascii numbers [45, 48-57, 97-122] inclusive
  for (let i = 1; i < length; i++) {
    bytes.set(
      [
        faker.helpers.arrayElement([
          45,
          faker.datatype.number({ min: 48, max: 57 }),
          faker.datatype.number({ min: 97, max: 122 }),
        ]),
      ],
      i,
    );
  }

  return bytes;
});

const EnsNameFactory = Factory.define<Uint8Array>(() => {
  const ensName = faker.random.alphaNumeric(faker.datatype.number({ min: 3, max: 16 }));
  return utf8StringToBytes(ensName.concat(".eth"))._unsafeUnwrap();
});

/** Eth */

const BlockHashFactory = Factory.define<Uint8Array>(() => {
  return BytesFactory.build({}, { transient: { length: 32 } });
});

const EthAddressFactory = Factory.define<Uint8Array>(() => {
  return BytesFactory.build({}, { transient: { length: 20 } });
});

const SolAddressFactory = Factory.define<Uint8Array>(() => {
  return BytesFactory.build({}, { transient: { length: 32 } });
});

const TransactionHashFactory = Factory.define<Uint8Array>(() => {
  return BytesFactory.build(undefined, { transient: { length: 32 } });
});

/** Signers */

const Ed25519PrivateKeyFactory = Factory.define<Uint8Array>(() => {
  return ed25519.utils.randomPrivateKey();
});

const Ed25519PublicKeyFactory = Factory.define<Uint8Array>(() => {
  const privateKey = Ed25519PrivateKeyFactory.build();
  return ed25519.getPublicKey(privateKey);
});

const Ed25519SignerFactory = Factory.define<Ed25519Signer>(() => {
  return new NobleEd25519Signer(Ed25519PrivateKeyFactory.build());
});

const Ed25519SignatureFactory = Factory.define<Uint8Array>(() => {
  return BytesFactory.build({}, { transient: { length: 64 } });
});

const Eip712SignerFactory = Factory.define<Eip712Signer, { account: LocalAccount }>(({ transientParams }) => {
  const account = transientParams.account ?? privateKeyToAccount(generatePrivateKey());
  return new ViemLocalEip712Signer(account);
});

const Eip712SignatureFactory = Factory.define<Uint8Array>(() => {
  return BytesFactory.build(undefined, { transient: { length: 65 } });
});

/** Message Protobufs */

const CastIdFactory = Factory.define<protobufs.CastId>(() => {
  return protobufs.CastId.create({
    fid: FidFactory.build(),
    hash: MessageHashFactory.build(),
  });
});

const FarcasterNetworkFactory = Factory.define<protobufs.FarcasterNetwork>(() => {
  return faker.helpers.arrayElement([
    protobufs.FarcasterNetwork.DEVNET,
    protobufs.FarcasterNetwork.MAINNET,
    protobufs.FarcasterNetwork.TESTNET,
  ]);
});

const ReactionTypeFactory = Factory.define<protobufs.ReactionType>(() => {
  return faker.helpers.arrayElement([protobufs.ReactionType.LIKE, protobufs.ReactionType.RECAST]);
});

const UserDataTypeFactory = Factory.define<protobufs.UserDataType>(() => {
  return faker.helpers.arrayElement([
    protobufs.UserDataType.BIO,
    protobufs.UserDataType.DISPLAY,
    protobufs.UserDataType.USERNAME,
    protobufs.UserDataType.PFP,
    protobufs.UserDataType.URL,
  ]);
});

const MessageTypeFactory = Factory.define<protobufs.MessageType>(() => {
  return faker.helpers.arrayElement([
    protobufs.MessageType.CAST_ADD,
    protobufs.MessageType.CAST_REMOVE,
    protobufs.MessageType.REACTION_ADD,
    protobufs.MessageType.REACTION_REMOVE,
    protobufs.MessageType.USER_DATA_ADD,
    protobufs.MessageType.VERIFICATION_ADD_ETH_ADDRESS,
    protobufs.MessageType.VERIFICATION_REMOVE,
  ]);
});

const MessageFactory = Factory.define<protobufs.Message, { signer?: Ed25519Signer | Eip712Signer }, protobufs.Message>(
  ({ onCreate, transientParams }) => {
    onCreate(async (message: protobufs.Message) => {
      if (!message.data) {
        return message;
      }

      // Generate hash
      const dataBytes = protobufs.MessageData.encode(message.data).finish();
      if (message.hash.length === 0) {
        message.hash = blake3(dataBytes, { dkLen: 20 });
      }

      // Set signer
      const signer: Signer = transientParams.signer ?? Ed25519SignerFactory.build();

      // Generate signature
      if (message.signature.length === 0) {
        message.signature = (await signer.signMessageHash(message.hash))._unsafeUnwrap();
      }

      if (!message.signatureScheme) {
        message.signatureScheme = signer.scheme;
      }

      if (message.signer.length === 0) {
        message.signer = (await signer.getSignerKey())._unsafeUnwrap();
      }

      return message;
    });

    return protobufs.Message.create({
      data: CastAddDataFactory.build(),
      hashScheme: protobufs.HashScheme.BLAKE3,
    });
  },
);

const MessageDataFactory = Factory.define<protobufs.MessageData>(() => {
  return protobufs.MessageData.create({
    fid: FidFactory.build(),
    timestamp: getFarcasterTime()._unsafeUnwrap(),
    network: protobufs.FarcasterNetwork.TESTNET,
  });
});

const CastIdEmbedFactory = Factory.define<protobufs.Embed>(() => {
  return protobufs.Embed.create({ castId: CastIdFactory.build() });
});

const UrlEmbedFactory = Factory.define<protobufs.Embed>(() => {
  return protobufs.Embed.create({ url: faker.internet.url() });
});

const EmbedFactory = Factory.define<protobufs.Embed>(() => {
  return faker.helpers.arrayElement([CastIdEmbedFactory.build(), UrlEmbedFactory.build()]);
});

const CastAddBodyFactory = Factory.define<protobufs.CastAddBody>(() => {
  const text = faker.lorem.sentence(12);
  return protobufs.CastAddBody.create({
    embeds: [EmbedFactory.build(), EmbedFactory.build()],
    mentions: [FidFactory.build(), FidFactory.build(), FidFactory.build()],
    mentionsPositions: [0, Math.floor(text.length / 2), text.length], // Hack to avoid duplicates
    parentCastId: CastIdFactory.build(),
    text,
  });
});

const CastAddDataFactory = Factory.define<protobufs.CastAddData>(() => {
  return MessageDataFactory.build({
    castAddBody: CastAddBodyFactory.build(),
    type: protobufs.MessageType.CAST_ADD,
  }) as protobufs.CastAddData;
});

const CastAddMessageFactory = Factory.define<protobufs.CastAddMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.CastAddMessage>;
    });

    return MessageFactory.build(
      { data: CastAddDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.CastAddMessage;
  },
);

const CastRemoveBodyFactory = Factory.define<protobufs.CastRemoveBody>(() => {
  return protobufs.CastRemoveBody.create({
    targetHash: MessageHashFactory.build(),
  });
});

const CastRemoveDataFactory = Factory.define<protobufs.CastRemoveData>(() => {
  return MessageDataFactory.build({
    castRemoveBody: CastRemoveBodyFactory.build(),
    type: protobufs.MessageType.CAST_REMOVE,
  }) as protobufs.CastRemoveData;
});

const CastRemoveMessageFactory = Factory.define<protobufs.CastRemoveMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.CastRemoveMessage>;
    });

    return MessageFactory.build(
      { data: CastRemoveDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.CastRemoveMessage;
  },
);

const LinkCompactStateBodyFactory = Factory.define<protobufs.LinkCompactStateBody>(() => {
  return protobufs.LinkCompactStateBody.create({
    targetFids: [FidFactory.build()],
    type: "follow",
  });
});

const LinkBodyFactory = Factory.define<protobufs.LinkBody>(() => {
  return protobufs.LinkBody.create({
    targetFid: FidFactory.build(),
    type: "follow",
  });
});

const LinkCompactStateAddDataFactory = Factory.define<protobufs.LinkCompactStateAddData>(() => {
  return MessageDataFactory.build({
    linkCompactStateBody: LinkCompactStateBodyFactory.build(),
    type: protobufs.MessageType.LINK_COMPACT_STATE,
  }) as protobufs.LinkCompactStateAddData;
});

const LinkAddDataFactory = Factory.define<protobufs.LinkAddData>(() => {
  return MessageDataFactory.build({
    linkBody: LinkBodyFactory.build(),
    type: protobufs.MessageType.LINK_ADD,
  }) as protobufs.LinkAddData;
});

const LinkCompactStateMessageFactory = Factory.define<protobufs.LinkCompactStateMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, {
        transient: transientParams,
      }) as Promise<protobufs.LinkCompactStateMessage>;
    });

    return MessageFactory.build(
      { data: LinkCompactStateAddDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.LinkCompactStateMessage;
  },
);

const LinkAddMessageFactory = Factory.define<protobufs.LinkAddMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.LinkAddMessage>;
    });

    return MessageFactory.build(
      { data: LinkAddDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.LinkAddMessage;
  },
);

const LinkRemoveDataFactory = Factory.define<protobufs.LinkRemoveData>(() => {
  return MessageDataFactory.build({
    linkBody: LinkBodyFactory.build(),
    type: protobufs.MessageType.LINK_REMOVE,
  }) as protobufs.LinkRemoveData;
});

const LinkRemoveMessageFactory = Factory.define<protobufs.LinkRemoveMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.LinkRemoveMessage>;
    });

    return MessageFactory.build(
      { data: LinkRemoveDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.LinkRemoveMessage;
  },
);

const ReactionBodyFactory = Factory.define<protobufs.ReactionBody>(() => {
  return protobufs.ReactionBody.create({
    targetCastId: CastIdFactory.build(),
    type: ReactionTypeFactory.build(),
  });
});

const ReactionAddDataFactory = Factory.define<protobufs.ReactionAddData>(() => {
  return MessageDataFactory.build({
    reactionBody: ReactionBodyFactory.build(),
    type: protobufs.MessageType.REACTION_ADD,
  }) as protobufs.ReactionAddData;
});

const ReactionAddMessageFactory = Factory.define<protobufs.ReactionAddMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.ReactionAddMessage>;
    });

    return MessageFactory.build(
      { data: ReactionAddDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.ReactionAddMessage;
  },
);

const ReactionRemoveDataFactory = Factory.define<protobufs.ReactionRemoveData>(() => {
  return MessageDataFactory.build({
    reactionBody: ReactionBodyFactory.build(),
    type: protobufs.MessageType.REACTION_REMOVE,
  }) as protobufs.ReactionRemoveData;
});

const ReactionRemoveMessageFactory = Factory.define<protobufs.ReactionRemoveMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.ReactionRemoveMessage>;
    });

    return MessageFactory.build(
      { data: ReactionRemoveDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.ReactionRemoveMessage;
  },
);

const VerificationSolAddressClaimFactory = Factory.define<VerificationAddressClaimSolana>(() => {
  const address = bytesToBase58(SolAddressFactory.build())._unsafeUnwrap();
  const blockHash = bytesToBase58(BlockHashFactory.build())._unsafeUnwrap();
  if (base58ToBytes(address)._unsafeUnwrap().length !== 32) {
    throw new Error(`Bad address: ${address}`);
  }

  return {
    fid: BigInt(FidFactory.build()),
    address,
    network: FarcasterNetworkFactory.build(),
    blockHash,
    protocol: Protocol.SOLANA,
  };
});

const VerificationEthAddressClaimFactory = Factory.define<VerificationAddressClaimEthereum>(() => {
  const address = bytesToHexString(EthAddressFactory.build())._unsafeUnwrap();
  const blockHash = bytesToHexString(BlockHashFactory.build())._unsafeUnwrap();

  return {
    fid: BigInt(FidFactory.build()),
    address,
    network: FarcasterNetworkFactory.build(),
    blockHash,
    protocol: Protocol.ETHEREUM,
  };
});

const VerificationAddAddressBodyFactory = Factory.define<
  protobufs.VerificationAddAddressBody,
  {
    fid?: number;
    network?: protobufs.FarcasterNetwork;
    signer?: Eip712Signer | Ed25519Signer | undefined;
    contractSignature?: boolean;
    protocol: Protocol;
  },
  protobufs.VerificationAddAddressBody
>(({ onCreate, transientParams }) => {
  onCreate(async (body) => {
    switch (transientParams.protocol) {
      case Protocol.ETHEREUM: {
        const ethSigner = transientParams.signer ?? Eip712SignerFactory.build();
        if (!transientParams.contractSignature) {
          body.address = (await ethSigner.getSignerKey())._unsafeUnwrap();
        }
        if (body.claimSignature.length === 0) {
          // Generate address and signature
          const fid = transientParams.fid ?? FidFactory.build();
          const network = transientParams.network ?? FarcasterNetworkFactory.build();
          const blockHash = bytesToHexString(body.blockHash);
          const claim = VerificationEthAddressClaimFactory.build({
            fid: BigInt(fid),
            network,
            blockHash: blockHash.isOk() ? blockHash.value : "0x",
            address: bytesToHexString(body.address)._unsafeUnwrap(),
            protocol: Protocol.ETHEREUM,
          });
          body.claimSignature = (
            await (ethSigner as Eip712Signer).signVerificationEthAddressClaim(claim, body.chainId)
          )._unsafeUnwrap();
        }
        body.protocol = Protocol.ETHEREUM;
        return body;
      }
      case Protocol.SOLANA: {
        const solSigner = transientParams.signer ?? Ed25519SignerFactory.build();
        body.address = (await solSigner.getSignerKey())._unsafeUnwrap();
        if (body.claimSignature.length === 0) {
          const fid = transientParams.fid ?? FidFactory.build();
          const network = transientParams.network ?? FarcasterNetworkFactory.build();
          const blockHash = body.blockHash;
          const claim = VerificationSolAddressClaimFactory.build({
            fid: toBigInt(fid),
            network: network,
            blockHash: bytesToBase58(blockHash)._unsafeUnwrap(),
            address: bytesToBase58(body.address)._unsafeUnwrap(),
            protocol: Protocol.SOLANA,
          });
          const fullMessage = recreateSolanaClaimMessage(claim as VerificationAddressClaimSolana, body.address);
          body.claimSignature = hexToBytes(bytesToHex((await solSigner.signMessageHash(fullMessage))._unsafeUnwrap()));
        }
        body.protocol = Protocol.SOLANA;
        return body;
      }
      default:
        throw new Error(`Unsupported protocol [found: ${transientParams.protocol}]`);
    }
  });

  return protobufs.VerificationAddAddressBody.create({
    address: EthAddressFactory.build(),
    blockHash: BlockHashFactory.build(),
  });
});

const VerificationAddSolAddressDataFactory = Factory.define<
  protobufs.VerificationAddAddressData,
  { signer?: Ed25519Signer | undefined }
>(({ onCreate, transientParams }) => {
  onCreate(async (data) => {
    const body = data.verificationAddAddressBody;
    if (body.claimSignature.length === 0) {
      data.verificationAddAddressBody = await VerificationAddAddressBodyFactory.create(body, {
        transient: {
          fid: data.fid,
          network: data.network,
          signer: transientParams.signer,
          protocol: Protocol.SOLANA,
        },
      });
    }
    return data;
  });

  return MessageDataFactory.build({
    // verificationAddEthAddressBody will not be valid until onCreate
    verificationAddAddressBody: VerificationAddAddressBodyFactory.build(
      { protocol: Protocol.SOLANA },
      { transient: { protocol: Protocol.SOLANA } },
    ),
    type: protobufs.MessageType.VERIFICATION_ADD_ETH_ADDRESS,
  }) as protobufs.VerificationAddAddressData;
});

const VerificationAddSolAddressMessageFactory = Factory.define<
  protobufs.VerificationAddAddressMessage,
  { signer?: Ed25519Signer }
>(({ onCreate, transientParams, params }) => {
  const signer: Ed25519Signer = transientParams.signer ?? Ed25519SignerFactory.build();

  onCreate(async (message) => {
    message.data = await VerificationAddSolAddressDataFactory.create(message.data, {
      transient: { signer: transientParams.signer },
    });
    return MessageFactory.create(message, {
      transient: { signer },
    }) as Promise<protobufs.VerificationAddAddressMessage>;
  });

  return MessageFactory.build(
    {
      data: VerificationAddSolAddressDataFactory.build(params.data, {
        transient: { signer: transientParams.signer },
      }),
    },
    { transient: { signer } },
  ) as protobufs.VerificationAddAddressMessage;
});

const VerificationAddEthAddressDataFactory = Factory.define<
  protobufs.VerificationAddAddressData,
  { signer?: Eip712Signer | undefined }
>(({ onCreate, transientParams }) => {
  onCreate(async (data) => {
    const body = data.verificationAddAddressBody;
    if (body.claimSignature.length === 0) {
      data.verificationAddAddressBody = await VerificationAddAddressBodyFactory.create(body, {
        transient: {
          fid: data.fid,
          network: data.network,
          signer: transientParams.signer,
          protocol: Protocol.ETHEREUM,
        },
      });
    }
    return data;
  });

  return MessageDataFactory.build({
    // verificationAddEthAddressBody will not be valid until onCreate
    verificationAddAddressBody: VerificationAddAddressBodyFactory.build({ protocol: Protocol.ETHEREUM }),
    type: protobufs.MessageType.VERIFICATION_ADD_ETH_ADDRESS,
  }) as protobufs.VerificationAddAddressData;
});

const VerificationAddEthAddressMessageFactory = Factory.define<
  protobufs.VerificationAddAddressMessage,
  { signer?: Ed25519Signer; ethSigner?: Eip712Signer }
>(({ onCreate, transientParams, params }) => {
  const signer: Ed25519Signer = transientParams.signer ?? Ed25519SignerFactory.build();

  onCreate(async (message) => {
    message.data = await VerificationAddEthAddressDataFactory.create(message.data, {
      transient: { signer: transientParams.ethSigner },
    });
    return MessageFactory.create(message, {
      transient: { signer },
    }) as Promise<protobufs.VerificationAddAddressMessage>;
  });

  return MessageFactory.build(
    {
      data: VerificationAddEthAddressDataFactory.build(params.data, {
        transient: { signer: transientParams.ethSigner },
      }),
    },
    { transient: { signer } },
  ) as protobufs.VerificationAddAddressMessage;
});

const VerificationRemoveBodyFactory = Factory.define<protobufs.VerificationRemoveBody>(({ params }) => {
  switch (params.protocol) {
    case Protocol.ETHEREUM:
      return protobufs.VerificationRemoveBody.create({
        address: EthAddressFactory.build(),
        protocol: protobufs.Protocol.ETHEREUM,
      });
    case Protocol.SOLANA:
      return protobufs.VerificationRemoveBody.create({
        address: SolAddressFactory.build(),
        protocol: protobufs.Protocol.SOLANA,
      });
    default:
      throw new Error(`Unsupported protocol [found: ${params.protocol}]`);
  }
});

const VerificationRemoveDataFactory = MessageDataFactory.params({
  verificationRemoveBody: VerificationRemoveBodyFactory.build({ protocol: Protocol.ETHEREUM }),
  type: protobufs.MessageType.VERIFICATION_REMOVE,
}) as Factory<protobufs.VerificationRemoveData>;

const VerificationRemoveMessageFactory = MessageFactory.params({
  data: VerificationRemoveDataFactory.build(),
  signatureScheme: protobufs.SignatureScheme.ED25519,
}) as Factory<protobufs.VerificationRemoveMessage, { signer?: Ed25519Signer }>;

const UserDataBodyFactory = Factory.define<protobufs.UserDataBody>(() => {
  return protobufs.UserDataBody.create({
    type: UserDataTypeFactory.build(),
    value: faker.random.alphaNumeric(16), // 16 chars to stay within range for all UserDataAdd types
  });
});

const UserDataAddDataFactory = Factory.define<protobufs.UserDataAddData>(() => {
  return MessageDataFactory.build({
    userDataBody: UserDataBodyFactory.build(),
    type: protobufs.MessageType.USER_DATA_ADD,
  }) as protobufs.UserDataAddData;
});

const UserDataAddMessageFactory = Factory.define<protobufs.UserDataAddMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.UserDataAddMessage>;
    });

    return MessageFactory.build(
      { data: UserDataAddDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.UserDataAddMessage;
  },
);

const UsernameProofDataFactory = Factory.define<protobufs.UsernameProofData>(() => {
  const proofBody = UserNameProofFactory.build({
    type: UserNameType.USERNAME_TYPE_ENS_L1,
    name: EnsNameFactory.build(),
  });
  return MessageDataFactory.build({
    usernameProofBody: proofBody,
    type: protobufs.MessageType.USERNAME_PROOF,
    // Proof timestamp is in Unix seconds
    timestamp: toFarcasterTime(proofBody.timestamp * 1000)._unsafeUnwrap(),
    fid: proofBody.fid,
  }) as protobufs.UsernameProofData;
});

const UsernameProofMessageFactory = Factory.define<protobufs.UsernameProofMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.UsernameProofMessage>;
    });

    return MessageFactory.build(
      { data: UsernameProofDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.UsernameProofMessage;
  },
);

const FrameActionBodyFactory = Factory.define<protobufs.FrameActionBody>(() => {
  return protobufs.FrameActionBody.create({
    url: Buffer.from(faker.internet.url()),
    buttonIndex: faker.datatype.number({ min: 1, max: 4 }),
    castId: CastIdFactory.build(),
  });
});

const FrameActionDataFactory = Factory.define<protobufs.FrameActionData>(() => {
  return MessageDataFactory.build({
    frameActionBody: FrameActionBodyFactory.build(),
    type: protobufs.MessageType.FRAME_ACTION,
  }) as protobufs.FrameActionData;
});

const FrameActionMessageFactory = Factory.define<protobufs.FrameActionMessage, { signer?: Ed25519Signer }>(
  ({ onCreate, transientParams }) => {
    onCreate((message) => {
      return MessageFactory.create(message, { transient: transientParams }) as Promise<protobufs.FrameActionMessage>;
    });

    return MessageFactory.build(
      { data: FrameActionDataFactory.build(), signatureScheme: protobufs.SignatureScheme.ED25519 },
      { transient: transientParams },
    ) as protobufs.FrameActionMessage;
  },
);

const OnChainEventFactory = Factory.define<protobufs.OnChainEvent>(() => {
  return protobufs.OnChainEvent.create({
    type: OnChainEventType.EVENT_TYPE_SIGNER,
    chainId: 1,
    fid: FidFactory.build(),
    blockNumber: faker.datatype.number({ min: 1, max: 100_000 }),
    blockHash: BlockHashFactory.build(),
    blockTimestamp: Math.floor(faker.datatype.datetime({ min: FARCASTER_EPOCH, max: Date.now() }).getTime() / 1000),
    transactionHash: TransactionHashFactory.build(),
    logIndex: faker.datatype.number({ min: 0, max: 1_000 }),
  });
});

const UserNameProofFactory = Factory.define<protobufs.UserNameProof>(() => {
  return protobufs.UserNameProof.create({
    timestamp: Math.floor(Date.now() / 1000),
    signature: Eip712SignatureFactory.build(),
    owner: EthAddressFactory.build(),
    name: FnameFactory.build(),
    fid: FidFactory.build(),
    type: protobufs.UserNameType.USERNAME_TYPE_FNAME,
  });
});

const SignerEventBodyFactory = Factory.define<protobufs.SignerEventBody>(() => {
  return SignerEventBody.create({
    key: Ed25519PublicKeyFactory.build(),
    eventType: SignerEventType.ADD,
    keyType: 1,
    metadataType: 1,
  });
});

const SignerOnChainEventFactory = Factory.define<SignerOnChainEvent, { signer?: Uint8Array }>(({ transientParams }) => {
  return OnChainEventFactory.build({
    type: OnChainEventType.EVENT_TYPE_SIGNER,
    signerEventBody: transientParams.signer
      ? SignerEventBodyFactory.build({ key: transientParams.signer })
      : SignerEventBodyFactory.build(),
  }) as protobufs.SignerOnChainEvent;
});

const IdRegisterEventBodyFactory = Factory.define<protobufs.IdRegisterEventBody>(() => {
  return IdRegisterEventBody.create({
    eventType: IdRegisterEventType.REGISTER,
    from: EthAddressFactory.build(),
  });
});

const IdRegisterOnChainEventFactory = Factory.define<IdRegisterOnChainEvent, { to?: Uint8Array }>(
  ({ transientParams }) => {
    return OnChainEventFactory.build({
      type: OnChainEventType.EVENT_TYPE_ID_REGISTER,
      idRegisterEventBody: transientParams.to
        ? IdRegisterEventBodyFactory.build({ to: transientParams.to })
        : IdRegisterEventBodyFactory.build(),
    }) as protobufs.IdRegisterOnChainEvent;
  },
);

const SignerMigratedOnChainEventFactory = Factory.define<SignerMigratedOnChainEvent>(() => {
  return OnChainEventFactory.build({
    type: OnChainEventType.EVENT_TYPE_SIGNER_MIGRATED,
    fid: 0,
    signerMigratedEventBody: SignerMigratedEventBody.create({
      migratedAt: Math.floor(Date.now() / 1000) + 48 * 60 * 60, // Default to 48 hours in the future so pruning is not enabled
    }),
  }) as protobufs.SignerMigratedOnChainEvent;
});

const StorageRentEventBodyFactory = Factory.define<protobufs.StorageRentEventBody>(() => {
  return StorageRentEventBody.create({
    payer: EthAddressFactory.build(),
    units: faker.datatype.number({ min: 1, max: 10 }),
    expiry: getFarcasterTime()._unsafeUnwrap() + 60 * 60 * 24 * 365, // a year
  });
});

const StorageRentOnChainEventFactory = Factory.define<StorageRentOnChainEvent, { units?: number }>(
  ({ transientParams }) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const randomDate = faker.date.between(oneYearAgo, yesterday);
    const randomDateInSeconds = Math.floor(randomDate.getTime() / 1000);

    return OnChainEventFactory.build({
      type: OnChainEventType.EVENT_TYPE_STORAGE_RENT,
      blockTimestamp: randomDateInSeconds,
      storageRentEventBody: transientParams.units
        ? StorageRentEventBodyFactory.build({ units: transientParams.units })
        : StorageRentEventBodyFactory.build(),
    }) as protobufs.StorageRentOnChainEvent;
  },
);

export const Factories = {
  Fid: FidFactory,
  Fname: FnameFactory,
  Bytes: BytesFactory,
  MessageHash: MessageHashFactory,
  BlockHash: BlockHashFactory,
  EthAddress: EthAddressFactory,
  SolAddress: SolAddressFactory,
  EnsName: EnsNameFactory,
  TransactionHash: TransactionHashFactory,
  Ed25519PrivateKey: Ed25519PrivateKeyFactory,
  Ed25519PublicKey: Ed25519PublicKeyFactory,
  Ed25519Signer: Ed25519SignerFactory,
  Ed25519Signature: Ed25519SignatureFactory,
  Eip712Signer: Eip712SignerFactory,
  Eip712Signature: Eip712SignatureFactory,
  CastId: CastIdFactory,
  FarcasterNetwork: FarcasterNetworkFactory,
  ReactionType: ReactionTypeFactory,
  MessageType: MessageTypeFactory,
  MessageData: MessageDataFactory,
  Message: MessageFactory,
  CastIdEmbed: CastIdEmbedFactory,
  UrlEmbed: UrlEmbedFactory,
  Embed: EmbedFactory,
  CastAddBody: CastAddBodyFactory,
  CastAddData: CastAddDataFactory,
  CastAddMessage: CastAddMessageFactory,
  CastRemoveBody: CastRemoveBodyFactory,
  CastRemoveData: CastRemoveDataFactory,
  CastRemoveMessage: CastRemoveMessageFactory,
  FrameActionBody: FrameActionBodyFactory,
  FrameActionData: FrameActionDataFactory,
  FrameActionMessage: FrameActionMessageFactory,
  LinkBody: LinkBodyFactory,
  LinkAddData: LinkAddDataFactory,
  LinkAddMessage: LinkAddMessageFactory,
  LinkRemoveData: LinkRemoveDataFactory,
  LinkRemoveMessage: LinkRemoveMessageFactory,
  LinkCompactStateMessage: LinkCompactStateMessageFactory,
  ReactionBody: ReactionBodyFactory,
  ReactionAddData: ReactionAddDataFactory,
  ReactionAddMessage: ReactionAddMessageFactory,
  ReactionRemoveData: ReactionRemoveDataFactory,
  ReactionRemoveMessage: ReactionRemoveMessageFactory,
  VerificationEthAddressClaim: VerificationEthAddressClaimFactory,
  VerificationAddAddressBody: VerificationAddAddressBodyFactory,
  VerificationAddEthAddressData: VerificationAddEthAddressDataFactory,
  VerificationAddEthAddressMessage: VerificationAddEthAddressMessageFactory,
  VerificationSolAddressClaim: VerificationSolAddressClaimFactory,
  VerificationAddSolAddressData: VerificationAddSolAddressDataFactory,
  VerificationAddSolAddressMessage: VerificationAddSolAddressMessageFactory,
  VerificationRemoveBody: VerificationRemoveBodyFactory,
  VerificationRemoveData: VerificationRemoveDataFactory,
  VerificationRemoveMessage: VerificationRemoveMessageFactory,
  UserDataBody: UserDataBodyFactory,
  UserDataAddData: UserDataAddDataFactory,
  UserDataAddMessage: UserDataAddMessageFactory,
  UserNameProof: UserNameProofFactory,
  UsernameProofData: UsernameProofDataFactory,
  UsernameProofMessage: UsernameProofMessageFactory,
  OnChainEvent: OnChainEventFactory,
  SignerEventBody: SignerEventBodyFactory,
  SignerOnChainEvent: SignerOnChainEventFactory,
  IdRegistryOnChainEvent: IdRegisterOnChainEventFactory,
  IdRegistryEventBody: IdRegisterEventBodyFactory,
  SignerMigratedOnChainEvent: SignerMigratedOnChainEventFactory,
  StorageRentEventBody: StorageRentEventBodyFactory,
  StorageRentOnChainEvent: StorageRentOnChainEventFactory,
};
