import  { useContext } from 'react'
import AuthContext from '../context/AuthContext'
import { Navigate } from 'react-router-dom';


function ProtectedRoutes({children}) {
    const {User}=useContext(AuthContext);
    
    if(!User)return <Navigate to="/login" />
    return children;
}

export default ProtectedRoutes;
