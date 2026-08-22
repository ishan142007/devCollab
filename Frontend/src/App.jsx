import Login from "./pages/Login";
import Signup from "./pages/Signup"
// import Signup from "./pages/Signup"
import { Route, Routes} from "react-router-dom";
import "./App.css";
import Dashboard from "./pages/Dashboard";

function App() {


  return (
  <>
  {/* <h1 className="bg-slate-800">hello world</h1> */}
 {/* <Login/> */
 }
  <Routes>
    <Route path="/login" element={<Login/>} />
    <Route path="/signup" element={<Signup/>}/>
    <Route path="/" element={<Dashboard/>}/>
  </Routes>
</>
  )
}

export default App
