import Login from "./pages/Login";
import Signup from "./pages/Signup"
// import Signup from "./pages/Signup"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import "./App.css";

function App() {


  return (
  <>
  {/* <h1 className="bg-slate-800">hello world</h1> */}
 {/* <Login/> */
 }
  <BrowserRouter>
  <Routes>
    <Route path="/login" element={<Login/>} />
    <Route path="/signup" element={<Signup/>}/>
  </Routes>
  </BrowserRouter>
  

  </>
  )
}

export default App
