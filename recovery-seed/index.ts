import { AccountExtendedPublicKey, ExtendedPrivateKey } from "./key"
import Keychain from "./keychain"
import { mnemonicToSeedSync, validateMnemonic } from "./mnemonic"
import wordList from "./word-list"

enum AddressType {
  Receiving = 0, // External chain
  Change = 1, // Internal chain
}

function createWallet(mnemonic: string) {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('invalid mnemonic')
  }

  const seed = mnemonicToSeedSync(mnemonic)
  const masterKeychain = Keychain.fromSeed(seed)
  if (!masterKeychain.privateKey) {
    throw new Error('invalid mnemonic')
  }
  const extendedKey = new ExtendedPrivateKey(
    masterKeychain.privateKey.toString('hex'),
    masterKeychain.chainCode.toString('hex')
  )
  const accountKeychain = masterKeychain.derivePath(AccountExtendedPublicKey.ckbAccountPath)
  const accountExtendedPublicKey = new AccountExtendedPublicKey(
    accountKeychain.publicKey.toString('hex'),
    accountKeychain.chainCode.toString('hex')
  )

  const receiving = Array.from({ length: 20 }).map((_, idx) => {
    const addressMetaInfo = {
      addressType: AddressType.Receiving,
      addressIndex: idx,
      accountExtendedPublicKey: extendedKey,
    }
    return accountExtendedPublicKey.address(
      addressMetaInfo.addressType,
      addressMetaInfo.addressIndex,
      true
    ).address
  })

  if (receiving.some(v => v === 'ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq2xlhj85d5u6aw9vqq5cxuxl7fgkz9240sz3gwce')) {
   console.info(`the mnemonic word is ${mnemonic}`)
   return true
  }
}
// scan orbit record ocean round pride cancel just turkey mouse swap punch
// ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq2xlhj85d5u6aw9vqq5cxuxl7fgkz9240sz3gwce
// ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqv4rmy4nzrkgvpypze4dtydswjheqq766gnmtjkv
// ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqg7zvqml3qg07w5gt85hakfjp22r9exuus4yg708
function main() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  readline.question(`Please enter your 11 words, example: entry festival medal improve aerobic farm match real expect pudding frost\r\n`, (existWords: string) => {
    readline.close()
    if (existWords.split(' ').length !== 11) {
      console.error('exist words is not 11')
      return
    }
    for (let index = 0; index < wordList.length; index++) {
      for (let loc = 0; loc < 12; loc++) {
        try {
          const words = existWords.split(' ')
          words.splice(loc, 0, wordList[index])
          if (createWallet(words.join(' '))) {
            console.info(`The missing word is ${wordList[index]}`)
            return
          }
        } catch (error) {
          // if error, skip
        }
      }
    }
    console.error('sorry, may be your 11 words is not correct')
  });

}

main()