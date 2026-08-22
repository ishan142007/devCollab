import axios from 'axios';
import {createContext,useState ,useEffect}from 'react'
const AuthContext = createContext();  //yeh el shared channel state create karta hai.

//createing the provider 
export const AuthProvider=({children})=>{
  const [User, setUser] = useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(() => {
  const checkAuth=async()=>{
    setLoading(true);
    try {
      const response=await axios.get("http://localhost:3000/api/auth/me",{withCredentials:true});
      setUser(response.data.data);
    } catch (error) {
      setUser(null);
      console.log(error)
    }finally{
      setLoading(false);
    }
  }
  checkAuth();
}, [])
if(loading)return <h1>.....loading.....</h1>
  
  return (
  <AuthContext.Provider value={{User,loading}}>
    {children}
  </AuthContext.Provider>

  )
}

export default AuthContext
