// import React from 'react'
import { useState } from "react";
const Signup = () => {
  const [pass, setpass] = useState("");
  const [email, setemail] = useState("");
  const [name, setname] = useState("");
const handleSubmit=async(e)=>{
  e.preventDefault();
  if(!name||!pass||!email){
    return 
  }
}
  return (
    <>
      <section className="w-full h-full flex items-center">
        <div className="w-50 h-70 ">
            <form action="" className="w-full h-full" onSubmit={handleSubmit}>
                name:<input type="text" placeholder="enter name" onChange={(e)=>setname(e.target.value)}/>
                email:<input type="email" placeholder="enter email" onChange={(e)=>setemail(e.target.value)}/>
                password:<input type="password" placeholder="enter password" onChange={(e)=>setpass(e.target.value)}/>
                <input type="submit" />
            </form>
        </div>
      </section>
    </>
  )
}

export default Signup
