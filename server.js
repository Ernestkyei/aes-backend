const app  = require("./app");
const dotenv = require("dotenv");



dotenv.config({path: "./config/config.env"});
const PORT = process.env.PORT





app.listen(PORT, () =>{
    console.log(`server is running on port ${PORT}`);
})