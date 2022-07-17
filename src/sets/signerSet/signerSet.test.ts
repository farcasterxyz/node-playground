/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-restricted-imports */
import SignerSet, { SignerAdd, SignatureAlgorithm, HashAlgorithm, SignerRemove } from './signerSet';
import { blake2b } from 'ethereum-cryptography/blake2b';
import { randomBytes } from 'crypto';
const secp = require('ethereum-cryptography/secp256k1');

const FarcasterSchemaUrl = 'farcaster.xyz/schemas/v1/signer-authorize';

describe('create signer set', () => {
  test('successfully creates a signer set', async () => {
    const signerSet = new SignerSet();
    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    expect(signerSet.addCustody(custodySignerEncodedPubkey).isOk()).toEqual(true);
    expect(signerSet._numSigners()).toEqual(1);

    const custodySigner2 = newSecp256k1Key();
    const custodySignerPubkey2 = secp.getPublicKey(custodySigner2);
    const custodySignerEncodedPubkey2 = Buffer.from(custodySignerPubkey2.toString()).toString('base64');

    expect(signerSet.addCustody(custodySignerEncodedPubkey2).isOk()).toEqual(true);
    expect(signerSet._numSigners()).toEqual(2);
  });

  test('fails when same root is tried to be added twice', async () => {
    const signerSet = new SignerSet();
    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    expect(signerSet.addCustody(custodySignerEncodedPubkey).isOk()).toEqual(true);
    expect(signerSet._numSigners()).toEqual(1);

    expect(signerSet.addCustody(custodySignerEncodedPubkey).isOk()).toEqual(false);
    expect(signerSet._numSigners()).toEqual(1);
  });
});

describe('add delegate', () => {
  test('successfully adds a delegate to a signer set', async () => {
    const signerSet = new SignerSet();

    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    signerSet.addCustody(custodySignerEncodedPubkey);
    expect(signerSet._numSigners()).toEqual(1);

    const childKey = newSecp256k1Key();
    const childPubkey = secp.getPublicKey(childKey);
    const childEncodedPubkey = Buffer.from(childPubkey.toString()).toString('base64');

    const hash = blake2b(randomBytes(32), 32);
    const custodySignerSig = secp.signSync(hash, custodySigner);
    const childKeySig = secp.signSync(hash, childKey);

    const signerAddition = <SignerAdd>{
      message: {
        body: {
          parentKey: custodySignerEncodedPubkey,
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    const addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(true);
  });

  test('fails when delegate exists in another custody signer', async () => {
    const signerSet = new SignerSet();

    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    signerSet.addCustody(custodySignerEncodedPubkey);
    expect(signerSet._numSigners()).toEqual(1);

    const childKey = newSecp256k1Key();
    const childPubkey = secp.getPublicKey(childKey);
    const childEncodedPubkey = Buffer.from(childPubkey.toString()).toString('base64');

    const hash = blake2b(randomBytes(32), 32);
    const custodySignerSig = secp.signSync(hash, custodySigner);
    const childKeySig = secp.signSync(hash, childKey);

    const custodySigner2 = newSecp256k1Key();
    const custodySignerPubkey2 = secp.getPublicKey(custodySigner2);
    const custodySignerEncodedPubkey2 = Buffer.from(custodySignerPubkey2.toString()).toString('base64');
    const custodySignerSig2 = secp.signSync(hash, custodySigner2);

    expect(signerSet.addCustody(custodySignerEncodedPubkey2).isOk()).toBe(true);
    expect(signerSet._numSigners()).toEqual(2);

    let signerAddition = <SignerAdd>{
      message: {
        body: {
          parentKey: custodySignerEncodedPubkey,
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    let addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(true);

    signerAddition = <SignerAdd>{
      message: {
        body: {
          // parent is a root to a different Signer
          parentKey: custodySignerEncodedPubkey2,
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig2),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey2,
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(false);
  });

  test('fails when claimed parent does not exist', async () => {
    const signerSet = new SignerSet();

    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    signerSet.addCustody(custodySignerEncodedPubkey);
    expect(signerSet._numSigners()).toEqual(1);

    const childKey = newSecp256k1Key();
    const childPubkey = secp.getPublicKey(childKey);
    const childEncodedPubkey = Buffer.from(childPubkey.toString()).toString('base64');

    const hash = blake2b(randomBytes(32), 32);
    const custodySignerSig = secp.signSync(hash, custodySigner);
    const childKeySig = secp.signSync(hash, childKey);

    const signerAddition = <SignerAdd>{
      message: {
        body: {
          parentKey: 'foobar',
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: 'foobar',
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    const addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(false);
  });

  test('fails when child is in removed nodes', async () => {
    const signerSet = new SignerSet();

    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    signerSet.addCustody(custodySignerEncodedPubkey);
    expect(signerSet._numSigners()).toEqual(1);

    const childKey = newSecp256k1Key();
    const childPubkey = secp.getPublicKey(childKey);
    const childEncodedPubkey = Buffer.from(childPubkey.toString()).toString('base64');

    const hash = blake2b(randomBytes(32), 32);
    const custodySignerSig = secp.signSync(hash, custodySigner);
    const childKeySig = secp.signSync(hash, childKey);

    const signerAddition = <SignerAdd>{
      message: {
        body: {
          parentKey: custodySignerEncodedPubkey,
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    let addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(true);

    const signerRemove = <SignerRemove>{
      message: {
        body: {
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(childKeySig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
      },
    };

    const removeWorked = signerSet.removeDelegate(signerRemove);
    expect(removeWorked.isOk()).toEqual(true);

    // This will fail since delegate has been revoked
    addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(false);
  });

  test('fails when child is an existing node', async () => {
    const signerSet = new SignerSet();

    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    signerSet.addCustody(custodySignerEncodedPubkey);
    expect(signerSet._numSigners()).toEqual(1);

    const childKey = newSecp256k1Key();
    const childPubkey = secp.getPublicKey(childKey);
    const childEncodedPubkey = Buffer.from(childPubkey.toString()).toString('base64');

    const hash = blake2b(randomBytes(32), 32);
    const custodySignerSig = secp.signSync(hash, custodySigner);
    const childKeySig = secp.signSync(hash, childKey);

    const signerAddition = <SignerAdd>{
      message: {
        body: {
          parentKey: custodySignerEncodedPubkey,
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    let addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(true);

    addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(false);
  });
});

describe('remove delegate', () => {
  test('successfully deletes delegates and child delegate', async () => {
    const signerSet = new SignerSet();

    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    signerSet.addCustody(custodySignerEncodedPubkey);
    expect(signerSet._numSigners()).toEqual(1);

    const childKey = newSecp256k1Key();
    const childPubkey = secp.getPublicKey(childKey);
    const childEncodedPubkey = Buffer.from(childPubkey.toString()).toString('base64');

    const hash = blake2b(randomBytes(32), 32);
    const custodySignerSig = secp.signSync(hash, custodySigner);
    const childKeySig = secp.signSync(hash, childKey);

    // Add Delegate to root
    const signerAddition = <SignerAdd>{
      message: {
        body: {
          parentKey: custodySignerEncodedPubkey,
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    const addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(true);

    // Add Delegate 1_1 to Delegate 1

    const childKey1_1 = newSecp256k1Key();
    const childPubkey1_1 = secp.getPublicKey(childKey1_1);
    const childEncodedPubkey1_1 = Buffer.from(childPubkey1_1.toString()).toString('base64');
    const childKey1_1Sig = secp.signSync(hash, childKey1_1);

    const signerAddition2_1 = <SignerAdd>{
      message: {
        body: {
          parentKey: childEncodedPubkey,
          childKey: childEncodedPubkey1_1,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(childKeySig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: childEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKey1_1Sig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey1_1,
      },
    };

    const addWorked2_1 = signerSet.addDelegate(signerAddition2_1);
    expect(addWorked2_1.isOk()).toEqual(true);

    // Remove delegate 1 (and 1_1) success

    const signerRemove = <SignerRemove>{
      message: {
        body: {
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
      },
    };

    const removeWorked = signerSet.removeDelegate(signerRemove);
    expect(removeWorked.isOk()).toEqual(true);
    expect(signerSet._numRemoved()).toEqual(2);
  });

  test('fails because claimed parent is not actual parent of child', async () => {
    const signerSet = new SignerSet();

    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    signerSet.addCustody(custodySignerEncodedPubkey);
    expect(signerSet._numSigners()).toEqual(1);

    const childKey = newSecp256k1Key();
    const childPubkey = secp.getPublicKey(childKey);
    const childEncodedPubkey = Buffer.from(childPubkey.toString()).toString('base64');

    const hash = blake2b(randomBytes(32), 32);
    const custodySignerSig = secp.signSync(hash, custodySigner);
    const childKeySig = secp.signSync(hash, childKey);

    // Add Delegate to root
    const signerAddition = <SignerAdd>{
      message: {
        body: {
          parentKey: custodySignerEncodedPubkey,
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    const addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(true);

    // Add Delegate 1_1 to Delegate 1

    const childKey1_1 = newSecp256k1Key();
    const childPubkey1_1 = secp.getPublicKey(childKey1_1);
    const childEncodedPubkey1_1 = Buffer.from(childPubkey1_1.toString()).toString('base64');
    const childKey1_1Sig = secp.signSync(hash, childKey1_1);

    const signerAddition2_1 = <SignerAdd>{
      message: {
        body: {
          parentKey: childEncodedPubkey,
          childKey: childEncodedPubkey1_1,
          schema: 'farcaster.xyz/schemas/v1/signer-authorize',
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(childKeySig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: childEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKey1_1Sig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey1_1,
      },
    };

    const addWorked2_1 = signerSet.addDelegate(signerAddition2_1);
    expect(addWorked2_1.isOk()).toEqual(true);

    // Remove delegate 2_1 fail

    const signerRemove2_1 = <SignerRemove>{
      message: {
        body: {
          childKey: childEncodedPubkey1_1,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
      },
    };

    const removeWorked = signerSet.removeDelegate(signerRemove2_1);
    expect(removeWorked.isOk()).toEqual(false);
  });

  test('fails because delegate has been revoked', async () => {
    const signerSet = new SignerSet();

    const custodySigner = newSecp256k1Key();
    const custodySignerPubkey = secp.getPublicKey(custodySigner);
    const custodySignerEncodedPubkey = Buffer.from(custodySignerPubkey.toString()).toString('base64');

    signerSet.addCustody(custodySignerEncodedPubkey);
    expect(signerSet._numSigners()).toEqual(1);

    const childKey = newSecp256k1Key();
    const childPubkey = secp.getPublicKey(childKey);
    const childEncodedPubkey = Buffer.from(childPubkey.toString()).toString('base64');

    const hash = blake2b(randomBytes(32), 32);
    const custodySignerSig = secp.signSync(hash, custodySigner);
    const childKeySig = secp.signSync(hash, childKey);

    // Add Delegate to root
    const signerAddition = <SignerAdd>{
      message: {
        body: {
          parentKey: custodySignerEncodedPubkey,
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(custodySignerSig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
        childSignature: base64EncodeUInt8Arr(childKeySig),
        childSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        childSignerPubkey: childEncodedPubkey,
      },
    };

    const addWorked = signerSet.addDelegate(signerAddition);
    expect(addWorked.isOk()).toEqual(true);

    // Remove delegate
    const signerRemove = <SignerRemove>{
      message: {
        body: {
          childKey: childEncodedPubkey,
          schema: FarcasterSchemaUrl,
        },
        account: 1,
      },
      envelope: {
        hash: base64EncodeUInt8Arr(hash),
        hashType: HashAlgorithm.Blake2b,
        parentSignature: base64EncodeUInt8Arr(childKeySig),
        parentSignatureType: SignatureAlgorithm.EcdsaSecp256k1,
        parentSignerPubkey: custodySignerEncodedPubkey,
      },
    };

    let removeWorked = signerSet.removeDelegate(signerRemove);
    expect(removeWorked.isOk()).toEqual(true);

    // Fails since Delegate has already been revoked
    removeWorked = signerSet.removeDelegate(signerRemove);
    expect(removeWorked.isOk()).toEqual(false);
  });
});

function newSecp256k1Key() {
  return randomBytes(32);
}

function base64EncodeUInt8Arr(arr: Uint8Array) {
  return Buffer.from(arr).toString('base64');
}
