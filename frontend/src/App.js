import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./components/Header/Header";
import Feed from "./components/Feed/Feed";
import Login from "./components/Login/Login";
import Register from "./components/Register/Register";
import NewPost from "./components/NewPost/NewPost";

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/myposts" element={<h1>My Posts</h1>} />
          <Route path="/mypage" element={<h1>My Page</h1>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/newpost" element={<NewPost />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;