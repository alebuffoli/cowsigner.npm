import { web3 } from '@project-serum/anchor'
import axios from 'axios'
// import {PublicKey} from "@solana/web3.js";


const opts = {
    preflightCommitment: "processed",
    commitment: "processed",
}

export default {
    sendInstruction: async function sendInstruction(method, appWallet, contractId) {

        console.log(method.constructor.name)
        console.log(typeof method)
        const args = method._args
        const aaa = method._ixFn
        console.log(aaa)
        console.log(args)
        console.log(method._accountsResolver._idlIx)

        const functionName = method._accountsResolver._idlIx.name
        console.log(functionName)
        const connection = method._accountsResolver._provider.connection
        const wallet = method._accountsResolver._provider.wallet

        console.log('instruction')
        const instruction = method._ixFn(...method._args)
        console.log(instruction)

        let tx = new web3.Transaction();
        tx.add(instruction);

        tx.feePayer = appWallet

        tx.recentBlockhash = (
            await connection.getRecentBlockhash(opts.preflightCommitment)
        ).blockhash;


        for (const item of method._args) {
            console.log(typeof item)
            if (typeof item === "object" && 'signers' in item) {
                console.log(item['signers'])

                for (const sig of item['signers']) {
                    console.log(sig)
                    tx.partialSign(sig);
                }
            }
        }

        await wallet.signTransaction(tx);

        const config_serializer = {
            requireAllSignatures: true,
            verifySignatures: false
        }
        const rawTx = await tx.serialize(config_serializer);

        const payload = {
            raw_transaction: rawTx,
            signer_pubkey: wallet.publicKey,
        }

        const headers = {
            'Content-Type': 'application/json',
        };

        await axios.post(`https://api.cowsigner.com/v1/service/sign/${contractId}`, payload, {headers})
    },

    addSignerToContract: async function addSignerToContract(apikey, customerPubkey, contractId) {
        const headers = {
            'Content-Type': 'application/json',
            'apikey': apikey
        }
        const payload = {
            "pubkey": customerPubkey,
            "block": contractId
        };

        axios.post('https://api.cowsigner.com/v1/service/block-signer/', payload, {headers})
            .then(function (response) {
                console.log(JSON.stringify(response.data));
            })
            .catch(function (error) {
                console.log(error);
            });
    }
}

