import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
    const {token} = req.cookies;
    if(!token){
        return res.status(401).json({ stats: false, message: 'Unauthorized. Login again' });
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        if(tokenDecode.id){
            req.userId = tokenDecode.id
        } 
        else{
            return res.status(401).json({ stats: false, message: 'Unauthorized. Login again' });
        }
        next();
    } catch (error) {
        return res.status(401).json({ stats: false, message: error.message});
    }
}

export default userAuth;