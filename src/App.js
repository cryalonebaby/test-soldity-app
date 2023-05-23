import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

import Lock from './artifacts/contracts/Lock.sol/Lock.json'

import './App.css';

const LockAddress = '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E'

function App() {
  const [contract, setContract] = useState(null)
  const [deposit, setDeposit] = useState('')
  const [unlockTime, setUnlockTime] = useState('');
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);

  // Helper Functions
  const requestAccounts = async () => {
    await window.ethereum.request({ method: 'eth_requestAccounts' })
  }

  const fetchLock = async () => {
    // If MetaMask exists
    if (typeof window.ethereum !== 'undefined') {

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const LockContract = new ethers.Contract(LockAddress, Lock.abi, provider)
      setContract(LockContract)

      const balance = await provider.getBalance(LockAddress)
      const balanceInEther = ethers.utils.formatEther(balance)
      setWithdrawnAmount(balanceInEther)
    }
  }

  useEffect(() => {
    let eventListener

    const fetchData = async () => {
      await fetchLock();
      listenToFallbackCalledEvent();
    };

    // Listeners 
    const listenToFallbackCalledEvent = async () => {
      try {
        if (typeof window.ethereum !== 'undefined') {
          await requestAccounts();

          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const contract = new ethers.Contract(LockAddress, Lock.abi, provider);

          if (eventListener) {
            eventListener.off()
          }

          eventListener = contract.on('FallbackCalled', (caller, value) => {
            console.log("FallbackCalled event received:");
            console.log("Caller:", caller);
            console.log("Value:", `${ethers.utils.formatEther(value)} ETH`);
          })
        }
      } catch (error) {
        console.log('Error:', error);
      }
    }

    fetchData()

    return () => {
      if (eventListener) {
        eventListener.off()
      }
    }

  }, [])

  // Handler Functions
  const handleUnlockTimeChange = (event) => {
    setUnlockTime(event.target.value);
  }

  const handleDepositChange = (event) => {
    setDeposit(event.target.value)
  }

  const handleDeposit = async () => {
    try {
      if (typeof window.ethereum !== 'undefined' && deposit !== '') {
        await requestAccounts()

        const provider = new ethers.providers.Web3Provider(window.ethereum)

        const value = ethers.utils.parseEther(deposit)

        const transaction = await provider.getSigner().sendTransaction({
          to: LockAddress,
          value: value
        })
        console.log('Транзакция отправлена. Ожидание подтверждения...');
        console.log(transaction);

        await transaction.wait()

        const receipt = await provider.getTransactionReceipt(transaction.hash)
        console.log(receipt);

        if (receipt && receipt.status) {
          console.log('Баланс пополнен');
          setDeposit('')
          setUnlockTime('')
          fetchLock();
        } else {
          console.log('Баланс непополнен!');
        }
      }
    } catch (error) {
      console.log('Error:', error);
    }
  }

  const handleWithdraw = async () => {
    try {
      // Calculate timestamp
      const currentTimestamp = Math.floor(Date.now() / 1000);

      if (typeof window.ethereum !== 'undefined' && unlockTime <= currentTimestamp) {
        await requestAccounts()

        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()

        // Create contract with signer
        const contract = new ethers.Contract(LockAddress, Lock.abi, signer)

        // Call Lock.withdraw
        /*
          function withdraw() public {
            require(block.timestamp >= unlockTime, "You can't withdraw yet");
            require(msg.sender == owner, "You aren't the owner");

            emit Withdrawal(address(this).balance, block.timestamp);

            owner.transfer(address(this).balance);
          }
        */
        const transaction = await contract.withdraw()

        console.log('Транзакция отправлена. Ожидание подтверждения...');
        console.log(transaction);

        await transaction.wait()

        const receipt = await provider.getTransactionReceipt(transaction.hash)
        console.log(receipt);

        if (receipt && receipt.status) {
          console.log('Вывод успешен');
          setDeposit('')
          setUnlockTime('')
          fetchLock()
        } else {
          console.log('Вывод неудался!');
        }

      } else {
        console.log('Unlock time has not arrived yet.');
      }
    } catch (error) {
      console.log('Error:', error);
    }
  }

  return (
    <div className="App">
      <div className='App-header'>
        <div>
          <h1>Deposit funds</h1>
          <div className='input-time'>
            <label>Deposit Amount:</label>
            <input className='input' value={deposit} onChange={handleDepositChange} type="number" placeholder='Enter Amount' />
          </div>
          <button className='btn' onClick={handleDeposit}>Deposit</button>
        </div>
        <div>
          <h1>Withdraw funds</h1>
          <div className='input-time'>
            <label>Unlock Time:</label>
            <input className='input' value={unlockTime} onChange={handleUnlockTimeChange} type="number" placeholder='Enter the time' />
          </div>
          <button className='btn' onClick={handleWithdraw}>Withdraw</button>
          <div>
            <p>Withdrawn Amount: {withdrawnAmount} ETH</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
