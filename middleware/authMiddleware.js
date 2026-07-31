import {verifyToken} from "../services/authService.js"

export const protect = (req, res, next ) =>{
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith(Bearer)){
        return res.status(401).json({success: false, message: "Not authorized, no token"})
    }


const token = authHeader.split(" ")[1];
const decoded = verifyToken(token);

if(!decode){
    return res.status(401).json({success: false, message: "Not authorized", invalid})
}

req.useId = decoded.useId;
next();
};