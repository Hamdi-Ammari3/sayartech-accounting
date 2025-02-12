import React,{useEffect,useState} from 'react'
import { CiLogout } from "react-icons/ci"
import { useRouter } from 'next/navigation'
import ClipLoader from "react-spinners/ClipLoader"

const Navbar = () => {
  const router = useRouter();
  const [userName,setUserName] = useState('')
  const [isLoggingOut,setIsLoggingOUt] = useState(false)

  useEffect(() => {
    const storedName = localStorage.getItem('adminDahboardName');
    setUserName(storedName)
  }, []);

  const logoutHandler = () => {
    setIsLoggingOUt(true)
    try {
      localStorage.removeItem('adminLoggedIn')
      localStorage.removeItem('adminName')
      localStorage.removeItem('adminDahboardName')
      router.push('/login');
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoggingOUt(false)
    }
  }

  return (
    <div className='navbar'>
        <div className='navbar_logo_div'>
            <h2>Sayartech</h2>
        </div>
        <div className='navbar_user_box'>
          <h5>{userName}</h5>
          {isLoggingOut ? (
            <div style={{ width:'70px',height:'30px',marginRight:'50px',border:'1px solid #cccc',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <ClipLoader
                color={'#999'}
                loading={isLoggingOut}
                size={10}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            </div>
          ) : (
            <button onClick={logoutHandler}>
              <p>خروج</p>
              <CiLogout style={{color:'#000',fontSize:15}} />
            </button>
          )}                   
        </div>
    </div>
  )
}

export default Navbar