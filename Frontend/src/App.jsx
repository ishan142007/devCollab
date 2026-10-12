import Login from "./pages/Login";
import Signup from "./pages/Signup"
// import Signup from "./pages/Signup"
import { Route, Routes} from "react-router-dom";
import ProtectedRoutes from "./components/ProtectedRoutes.jsx"
import Dashboard from "./pages/Dashboard";
import ProjectDetails from "./pages/ProjectDetails";
import ProfileSettings from "./pages/ProfileSettings";
import EvidenceProfile from "./pages/EvidenceProfile";

function App() {


  return (
  <>
  {/* <h1 className="bg-slate-800">hello world</h1> */}
 {/* <Login/> */
 }
  <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/signup" element={<Signup/>}/>
    <Route path="/u/:username" element={<EvidenceProfile/>}/>
    <Route path="/profile" element={
      <ProtectedRoutes>
        <ProfileSettings/>
      </ProtectedRoutes>
    }/>
    <Route path="/" element={
      <ProtectedRoutes>
        <Dashboard/>
      </ProtectedRoutes>
    }/>
    <Route path="/projects/:id" element={
      <ProtectedRoutes>
        <ProjectDetails />
      </ProtectedRoutes>
    } />
  </Routes>
</>
  )
}

export default App
