import  { useContext } from 'react'
import AuthContext from '../context/AuthContext'
import { Navigate } from 'react-router-dom';


function ProtectedRoutes({children}) {
    const {User,loading}=useContext(AuthContext);
    if(loading)return <>......checking session......</>
    if(!User)return <Navigate to="/login" />
    return children;
}

export default ProtectedRoutes;
