import { SignatureScheme } from '@farcaster/protobufs';
import { HubAsyncResult } from 'errors';
import { Signer } from './signer';

/**
 * Extend this class to implement an Ed25519 signer.
 */
export abstract class Ed25519Signer implements Signer {
  /** Signature scheme as defined in protobufs */
  public readonly scheme = SignatureScheme.ED25519;

  public abstract getSignerKey(): HubAsyncResult<Uint8Array>;
  public abstract signMessageHash(hash: Uint8Array): HubAsyncResult<Uint8Array>;
}
