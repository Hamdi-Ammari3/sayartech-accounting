"use client"
import React,{useState} from 'react'
import '../style.css'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where } from "firebase/firestore"
import { DB } from '../../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"

const Login = () => {
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading,setLoading] = useState(false)

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Query Firestore for admin credentials
      const q = query(
        collection(DB, "admins"),
        where("username", "==", username),
        where("password", "==", password)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();        
        localStorage.setItem('adminLoggedIn', true)
        localStorage.setItem('adminName', userData.username)
        localStorage.setItem('adminDahboardName', userData.dashboard_name)
        router.push('/')
      } else {
        setError('يرجى التثبت من المعلومات المدرجة')
      }
    } catch (err) {
      setError('يرجى التثبت من المعلومات المدرجة')
    }finally {
      setLoading(false)
    }
  };

  return (
    <div className='login-container'>
      <div className='login-container-box'>
        <div className='form-title-box'>
          <h2>Sayartech</h2>
        </div>
        {error && <p style={{color:'red'}}>{error}</p>}
        <div className='form-box'>
          <form className='form'>
            <input placeholder='اسم المستخدم' value={username} onChange={(e) => setUsername(e.target.value)}/>
            <input placeholder='كلمة المرور' value={password} onChange={(e) => setPassword(e.target.value)}/>
            {loading ? (
              <div style={{ width:'250px',height:'35px',backgroundColor:'#955BFE',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ClipLoader
                  color={'#fff'}
                  loading={loading}
                  size={10}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            ) : (
              <button onClick={handleLogin}>دخول</button>
            )}
            
          </form>
        </div>
      </div>  
    </div>
  )
}

export default Login
