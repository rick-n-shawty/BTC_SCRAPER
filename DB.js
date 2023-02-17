const mongoose = require('mongoose')

mongoose.set("strictQuery", false)

const connectDb = (uri) =>{
    return mongoose.connect(process.env.MONGO_URI)
}

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true],
        unique: true
    },
    isConfirmed: {
        type: Boolean,
        default: false
    },
    isTrackingActive: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: [true]
    }
})
const User = mongoose.model('users', UserSchema)
module.exports ={
    connectDb,
    User
}