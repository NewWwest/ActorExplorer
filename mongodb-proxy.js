var express = require('express')
var mongoose = require('mongoose')
var rxjs = require('rxjs')
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
app.use(express.json());
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
    total_rating: Number,
    total_revenue: Number,
    movies: [Schema.Types.ObjectId],
    total_revenue: Number,
    total_rating: Number

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

app.get('/api/movie/allMovies', (req, res) => {
    console.log(`Request for all movies`)
    movieModel.find({}, (err, data) => {
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
app.get('/api/actor/id/:actorId/movies', (req, res) => {
    console.log(`Request for movies of an actor by id:${req.params.actorId}`)
    var id = mongoose.Types.ObjectId(req.params.actorId);
    actorModel.findById(id, (err, data) => {
        if (err) {
            res.send(err);
            return;
        }
        var observables = data.movies.map(m => { return movieModel.findById(m, (err, d) => d); });
        rxjs.forkJoin(observables).subscribe(movieModels => {
            res.send(movieModels);
        })
    })
});
// app.get('/api/actor/id/:actorId/data', (req, res) => {
//     console.log(`Request for actor data by id:${req.params.actorId}`)
//     var id = mongoose.Types.ObjectId(req.params.actorId);
//     actorModel.findById(id, (err, data) => {
//         if (err) {
//             res.send(err);
//             return;
//         }
//         var observables = data.movies.map(m => { return movieModel.findById(m, (err, d) => d); });
//         rxjs.forkJoin(observables).subscribe(movieModels => {
//             var result = {
//                 _id: data._id,
//                 name: data.name,
//                 movies: data.movies,
//                 birth: data.birth,
//                 movieData: movieModels,
//                 total_rating: data.total_rating,
//                 total_revenue: data.total_revenue,
//             }
//             res.send(result);
//         })
//     })
// });
app.post('/api/actor/moviecount/', (req, res) => {
    console.log(`Request(POST) for multiple actors by id`)
    var observables = [];
    req.body.forEach(x => {
        var id = mongoose.Types.ObjectId(x);
        observables.push(actorModel.findById(id, (err, d) => d));
    })
    rxjs.forkJoin(observables).subscribe(actors => {
        var result = [];
        actors.forEach(x => {
            result.push({
                _id: x._id,
                count: x.movies.length
            });
        })
        res.send(result);
        return;
    })
});

app.get('/api/search/actorname/:name', (req, res) => {
    console.log(`Request for actors matching name:${req.params.name}`)
    actorModel.find({ name: { "$regex": req.params.name, $options: "i" } }, (err, data) => {
        if (err) {
            res.send(err);
        } else {
            res.send(data)
        }
    })
});

app.get('/api/search/random/', (_, res) => {
    console.log('Requested random actor');
    actorModel.aggregate().sample(1).exec((err, data) => {
        if (err) {
            res.send(err);
        } else {
            res.send(data)
        }
    })

})

app.get('/api/search/random/movie/:range', (req, res) => {
    console.log(`Requested random movie from time range: ${req.params.range}`);
    let range = req.params.range.split("-")
    movieModel.aggregate([{ "$match": { "year": { "$gte": parseInt(range[0]), "$lte": parseInt(range[1]) } } }]).sample(1).exec((err, data) => {
        if (err) {
            res.send(err);
        } else {
            res.send(data)
        }
    })

})



app.listen(4201, () => { console.log('Listening for requests') });
