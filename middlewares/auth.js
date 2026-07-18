import jwt from "jsonwebtoken"

export const protect = (req,resp,next) =>{
    const token = req.headers.authorization?.split(" ")[1];
    
    
    if (!token){
        return resp.status(401).json({ message:"Access denied. Please login"})

    }
    try {
        const decoded = jwt .verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return resp.status(401).json({message:"Invalid or expired Token"})
        
    }
}