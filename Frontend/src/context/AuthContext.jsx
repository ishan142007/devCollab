import axios from 'axios';
import {createContext,useState ,useEffect,useCallback}from 'react'
import { apiUrl } from "../config/api";
const AuthContext = createContext();  //yeh ek shared channel state create karta hai.

const getCurrentUser = async () => {
  const response = await axios.get(`${apiUrl}/api/auth/me`, { withCredentials: true });
  return response.data.data;
};

const logoutUser = async () => {
  await axios.post(`${apiUrl}/api/auth/logout`, {}, { withCredentials: true });
};

//createing the provider 
export const AuthProvider=({children})=>{
  const [User, setUser] = useState(null);
  const [loading,setLoading]=useState(true);
  const checkAuth= async() => {
    try {
      const user = await getCurrentUser();
      setUser(user);
      return user;
    } catch (error) {
      setUser(null);
      console.error(error);
      return null;
    }
  };
  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (!cancelled) setUser(user);
      } catch (error) {
        if (!cancelled) {
          setUser(null);
          console.error(error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadUser();
    return () => {
      cancelled = true;
    };
}, []);
const updateUser = useCallback((user) => setUser(user), []);
const logout = useCallback(async () => {
  await logoutUser();
  setUser(null);
}, []);

if(loading)return <h1>.....loading.....</h1>

  return (
  <AuthContext.Provider value={{User,loading,checkAuth,updateUser,logout}}>
    {children}
  </AuthContext.Provider>

  )
}

export default AuthContext
