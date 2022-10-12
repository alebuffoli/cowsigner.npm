import { web3 } from '@project-serum/anchor'
import axios from 'axios'

const opts = {
    preflightCommitment: "processed",
    commitment: "processed",
}

export default {
    sendInstruction: async function sendInstruction(method, appWallet, contractId, position_tx_certifier=null) {

        const args = method._args
        const aaa = method._ixFn

        const functionName = method._accountsResolver._idlIx.name

        const connection = method._accountsResolver._provider.connection
        const wallet = method._accountsResolver._provider.wallet

        const instruction = method._ixFn(...method._args)

        let tx = new web3.Transaction();

        method._preInstructions.forEach((ix) => tx.add(ix));
        tx.add(instruction);
        method._postInstructions.forEach((ix) => tx.add(ix));

        tx.feePayer = appWallet

        tx.recentBlockhash = (
            await connection.getRecentBlockhash(opts.preflightCommitment)
        ).blockhash;


        for (const item of method._args) {
            if (typeof item === "object" && 'signers' in item) {
                for (const sig of item['signers']) {
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

        if (!position_tx_certifier) {
            position_tx_certifier = method._preInstructions.length
        }

        const payload = {
            raw_transaction: rawTx,
            signer_pubkey: wallet.publicKey,
            position_tx_certifier: position_tx_certifier
        }

        const headers = {
            'Content-Type': 'application/json',
        };

        return await axios.post(`https://api.cowsigner.com/v1/service/sign/${contractId}`, payload, {headers})
    },

    addSignerToContract: async function addSignerToContract(apikey, customerPubkey, contractId, accountId) {
        const headers = {
            'Content-Type': 'application/json',
            'apikey': apikey
        }
        const payload = {
            "pubkey": customerPubkey,
            "block": contractId,
            "account": accountId
        };

        return axios.post('https://api.cowsigner.com/v1/service/block-signer/', payload, {headers})
            .then(function (response) {
                console.log(JSON.stringify(response.data));
            })
            .catch(function (error) {
                error.log(error);
            });
    }
}

