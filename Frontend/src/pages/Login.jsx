// import React from 'react'

import { useState } from "react"
import axios from "axios";
function Login() {
  const [email, setemail] = useState("")
  const [pass, setpass] = useState("")
  const handleSubmit=async(e)=>{
    e.preventDefault();
    try {
      if(!pass||!email)return<h2>please enter valid details</h2>
     await axios.post("http://localhost:3000/api/login",{
        email,password:pass
      },{
        withCredentials:true
      });
      console.log("login successfull");
      
    } catch (error) {
      console.error(error)
    }
   
  }
  return (
    <>
      <div>
        <div className="parent w-full h-screen items-center justify-center flex ">

        <form action="" onSubmit={handleSubmit} className="h-max w-50  border ">
          email:<input type="email" placeholder="enter email" onChange={(e)=>setemail(e.target.value)}/><br/>
          password:<input type="text" placeholder="enter password" onChange={(e)=>setpass(e.target.value)} /><br/>
          <input type="submit"  />
        </form>
        </div>
      </div>
    </>
  )
}

export default Login
