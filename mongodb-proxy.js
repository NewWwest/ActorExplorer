var express = require('express')
var mongoose = require('mongoose')
const { Schema } = mongoose;

var db = mongoose
    .connect('mongodb://localhost:27017/ActorExplorer', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("Connected to the database!");
    })
    .catch(err => {
        console.log("Cannot connect to the database!", err);
        process.exit();
    });
var app = express();
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
    res.setHeader('Access-Control-Allow-Credentials', true)
    next();
})


// TODO: we need to find a way to define this once (e.g. we defined these already in the models folder)
var actorSchema = new Schema({
    name: String,
    birth: Number,
    death: Number,
    movies: [Schema.Types.ObjectId],

});
var actorModel = mongoose.model('actor', actorSchema, 'actor')

var movieSchema = new Schema({
    title: String,
    year: Number,
    month: Number,
    day: Number,
    revenue: Number,
    vote_average: Number,
    actors: [Schema.Types.ObjectId],
});
var movieModel = mongoose.model('movie', movieSchema, 'movie')

app.get('/api/movie/id/:movieId', (req, res) => {
    console.log(`Request for movie by Id:${req.params.movieId}`)
    var id = mongoose.Types.ObjectId(req.params.movieId); 
    movieModel.findById(id, (err, data) => {
        if (err) {
            res.send(err);
        } else {
            res.send(data)
        }
    })
});
app.get('/api/actor/id/:actorId', (req, res) => {
    console.log(`Request for actor by Id:${req.params.actorId}`)
    var id = mongoose.Types.ObjectId(req.params.actorId)
    actorModel.findById(id, (err, data) => {
        if (err) {
            res.send(err);
        } else {
            res.send(data)
        }
    })
});
app.get('/api/actor/name/:name', (req, res) => {
    console.log(`Request for actor by name:${req.params.name}`)
    actorModel.findOne({ name: { "$regex": req.params.name } }, (err, data) => {
        if (err) {
            res.send(err);
        } else {
            res.send(data)
        }
    })
});
app.listen(4201, () => { console.log('Listening for requests') });