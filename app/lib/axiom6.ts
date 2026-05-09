import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import IDL from "../idl/axiom6.json";
export type Axiom6 = Program<Idl>;
export const getAxiom6Program = (provider: AnchorProvider): Axiom6 =>
  new Program(IDL as Idl, provider);
export const getRegistryPDA = (): [PublicKey, number] =>
  PublicKey.findProgramAddressSync([Buffer.from("registry")], PROGRAM_ID);
export const getAgentStatePDA = (agentPubkey: PublicKey): [PublicKey, number] =>
  PublicKey.findProgramAddressSync([Buffer.from("agent"), agentPubkey.toBuffer()], PROGRAM_ID);
export const getStakerReceiptPDA = (agentPubkey: PublicKey, stakerPubkey: PublicKey): [PublicKey, number] =>
  PublicKey.findProgramAddressSync([Buffer.from("receipt"), agentPubkey.toBuffer(), stakerPubkey.toBuffer()], PROGRAM_ID);
