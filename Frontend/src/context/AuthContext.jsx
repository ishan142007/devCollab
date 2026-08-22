import {createContext}from 'react'

const AuthContext = createContext();  //yeh el shared channel state create karta hai.

//createing the provider 
export const AuthProvider=({children})=>{
  <AuthContext.Provider value={{}}>
    {children}
  </AuthContext.Provider>
}

export default AuthContext
