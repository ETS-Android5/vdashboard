const constants = require('../config/constants');
const db = require('../config/mongo');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const LoremIpsum = require("lorem-ipsum").LoremIpsum;
const rimraf = require("rimraf");
const file = require('../_file');


const collections = {shows: 'shows'};

db.connect(err => {
    if (err) {
        console.log('Cannot connect to database');
        process.exit(1);
    } else {
        console.log('Connected to db');
    }
});

const shows = {
    get: (req, res) => {
        console.log('GET /api/v1/shows ', req.params, req.body);
        db.getDb().collection(collections.shows).find({}).toArray((err, shows) => {
            if (err) {
                console.log(err);
            } else {
                console.log('Shows: ', Array.isArray(shows), shows.length);
                res.status(200);
                shows.map(show => {
                   show.episodes && show.episodes.map(episode => {
                        episode.video = 'http://' + constants.serverIP + ':' + constants.port + episode.video;
                        episode.image = 'http://' + constants.serverIP + ':' + constants.port + episode.image;
                    });
                });
                const data = {
                    actions: {type: 'read', ok: 1},
                    list: shows
                };
                res.json(data);
            }
        });
    },
    remove: (req, res) => {
        rimraf(constants.IMAGES_DIR_PATH + '/*', function () {
            console.log("Removed " + constants.IMAGES_DIR_PATH + '*');
        });

        if (!fs.existsSync(constants.IMAGES_DIR_PATH)) {
            fs.mkdirSync(constants.IMAGES_DIR_PATH);
        }

        db.getDb().collection(collections.shows).remove({}, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log('Added show to mongodb:', req.body);
                result.message += ' , Removed from mongodb.';
                res.json({result});
            }
        });
    },
    // Generate thumbs for the show
    generate: (req, res) => {
        const files = shows._scanDir(constants.VIDEOS_DIR_PATH);
        shows._generateThumbs(files, false);

        const lorem = new LoremIpsum({
            sentencesPerParagraph: {
                max: 8,
                min: 4
            },
            wordsPerSentence: {
                max: 8,
                min: 4
            }
        });

        let data = [];

        files.forEach((file, c) => {

            let i = c + 1;
            let index = i < 10 ? '0' + i : i;

            let show = {};
            show.id = Number(index);
            show.title = lorem.generateWords(3);
            show.description = lorem.generateSentences(3);
            show.episodes = [];

            for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
                let episode = {
                    id: 'Episode 0' + (Number(i) + 1),
                    title: lorem.generateWords(3),
                    description: lorem.generateSentences(3),
                    image: constants.IMAGES_DIR + index + '.png',
                    video: constants.VIDEOS_DIR + file,
                };
                show.episodes.push(episode);
            }

            db.getDb().collection(collections.shows).insertOne(show, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Added show to mongodb:', req.body);
                    result.message += ' , Show saved to mongodb.';
                    // res.json({result: action.result, document: action.ops[0], error: null});
                }
            });

            data.push(show);
        });

        // console.log(data);
        return res.json(data);
    },
    _scanDir: (dir) => {
        const files = fs.readdirSync(dir);
        return files;
    },
    _generateThumbs: (files, regenerate = false) => {
        // Get images count
        const images = shows._scanDir(constants.IMAGES_DIR_PATH);
        const equalImagesAndVids = images.length === files.length;

        if (equalImagesAndVids && !regenerate) {
            console.log('Thumbnails already generated and number of images equal number of videos.');
            return false;
        }
        console.log('Generating thumbnails');

        files.forEach((file, c) => {
            let i = c + 1;
            let index = i < 10 ? '0' + i : i;

            let videoPath = constants.VIDEOS_DIR_PATH + '/' + file;
            let imagesPath = constants.IMAGES_DIR_PATH;
            const proc = new ffmpeg(videoPath)
                .takeScreenshots({
                    count: 1,
                    timemarks: ['6'], // number of seconds
                    filename: index + '.png',
                }, imagesPath, function (err, filenames) {
                    console.log('screenshots were not saved ' + err, filenames)
                });
        });
    },
    post: (req, res) => {
        console.log('POST2 /api/v1/shows');
        if (!req.files || Object.keys(req.files).length == 0) {
            // return res.status(400).json({result: 'No images were attached'});
        }
        const {title, description} = req.body;
        // const result = await file.save(req);
        const show = {
            title,
            description,
            episodes: []
        };

        db.getDb().collection(collections.shows).insertOne(show, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                const data = {
                    actions: {type: 'create', ok: result.result.ok},
                    form: {_id: result.insertedId, ...show},
                };
                res.json(data);
            }
        });
    },

    delete: (req, res) => {
        console.log('DELETE /api/v1/shows/:id ' + req.params.id);
        const showId = db.getPrimaryKey(req.params.id);
        db.getDb().collection(collections.shows).deleteOne(
            {_id: showId},
            (err, action) => {
                if (err) {
                    console.log('Error in deleting id ' + req.params.id);
                } else {
                    console.log(action);
                    const actions = {
                        type: 'delete', ok: 1
                    };
                    res.json(actions)
                }
            }
        );
    },
    popularize : (req, res) => {
        console.log('PUT /api/v1/popularize/:id ' + req.params.id);
        let [showId, episodeId] = req.params.id.split('+');
        console.log('PUT /api/v1/popularize/:id showId, episodeId ', showId, episodeId);
        // @TODO
        showId = db.getPrimaryKey(showId);
        db.getDb().collection(collections.shows).findOneAndUpdate(
            {_id: showId},
            {
                $inc: { "views" : 1 }
            },
            {returnOriginal: false},
            (err, result) => {
                if (err) {
                    console.log('Some error occurred. ', err);
                } else {
                    console.log('No files attached', result);
                    const actions = {
                        type: 'popularize', ok: result.ok
                    };
                    res.json({actions});
                }
            }
        )
    },
    deleteEpisode: (req, res) => {
        console.log('DELETE /api/v1/episodes/:id ' + req.params.id);
        let [showId, episodeId] = req.params.id.split('+');
        console.log('DELETE /api/v1/episodes/:id showId, episodeId ', showId, episodeId);

        showId = db.getPrimaryKey(showId);
        db.getDb().collection(collections.shows).findOneAndUpdate(
            {_id: showId},
            {$pull: {episodes: {_id: db.getPrimaryKey(episodeId)}}},
            {returnOriginal: false, upsert: true},
            (err, result) => {
                if (err) {
                    console.log('Some error occurred. ', err);
                } else {
                    console.log('Episode removed from show', result);
                    const actions = {
                        type: 'delete',
                        ok: result.ok
                    };
                    const form = {
                        showId, episodeId
                    };
                    res.json({actions, form});
                }
            }
        )
    },
    getEpisode: (req, res) => {
        res.json({result: 'Cannot get episodes directly, you need to call show api end point'});
    },
    _addToSet: (showId, episode, res) => {
        db.getDb().collection(collections.shows).findOneAndUpdate(
            {_id: showId},
            {$addToSet: {episodes: episode}},
            {returnOriginal: false, upsert: false},
            (err, result) => {
                if (err) {
                    console.log('Some error occurred. ', err);
                } else {
                    console.log('Show added or updated', result);
                    const actions = {
                        type: 'update',
                        ok: result.ok
                    };
                    const form = {
                        showId, episode
                    };
                    res.json({actions, form});
                }
            }
        );
    },
    updateEpisode: async (req, res) => {
        console.log('PUT /api/v1/episode/:id', req.body);
        const userInput = req.body;
        const result = await file.save(req);
        let episodeId = req.params.id; // no need here
        const {show_id, title, number, description, genre} = userInput;
        let showId = show_id;
        // console.log(result, 'showid, epi', showId, episodeId, userInput); return 1;
        // Check if result.image_path is null then use previous value from userInput
        let image_path = result.image_path;
        let video_path = result.video_path;

        if (result.image_path === null) {
            if (userInput.image.search('/images/') !== -1) {
                image_path = userInput.image.substring(userInput.image.search('/images/'));
            } else {
                image_path = userInput.image;
            }
        }
        if (result.video_path === null) {
            if (userInput.video.search('/videos/') !== -1) {
                video_path = userInput.video.substring(userInput.video.search('/videos/'));
            } else {
                video_path = userInput.video;
            }
        }
        const episode = {
            _id: db.getPrimaryKey(episodeId),
            title: title,
            number: number,
            description: description,
            genre: genre,
            image: image_path,
            video: video_path
        };

        showId = db.getPrimaryKey(showId);
        db.getDb().collection(collections.shows).findOneAndUpdate(
            {_id: showId},
            {$pull: {episodes: {_id: db.getPrimaryKey(episodeId)}}},
            {returnOriginal: false, upsert: false},
            (err, result) => {
                if (err) {
                    console.log('Some error occurred. ', err);
                } else {
                    console.log('Show added or updated', result);
                    return shows._addToSet(showId, episode, res);
                }
            }
        );
    },
    postEpisode: async (req, res) => {
        console.log('POST /api/v1/episode', req.body);
        const userInput = req.body;
        const result = await file.save(req);
        const {show_id, title, number, description, genre} = userInput;
        const showId = show_id ? db.getPrimaryKey(show_id) : db.getPrimaryKey();

        const episode = {
            _id: db.getPrimaryKey(),
            title: title,
            number: number,
            description: description,
            genre: genre,
            image: result.image_path,
            video: result.video_path
        };

        db.getDb().collection(collections.shows).findOneAndUpdate(
            {_id: showId},
            {$addToSet: {episodes: episode}},
            {returnOriginal: false, upsert: true},
            (err, result) => {
                if (err) {
                    console.log('Some error occurred. ', err);
                } else {
                    console.log('Show added or updated');
                    const actions = {
                        type: 'create',
                        ok: result.ok
                    };
                    const form = episode;
                    res.json({actions, form});
                }
            }
        )
    },
    update: async (req, res) => {
        console.log('PUT /api/v1/shows/:id', req.body);
        const showId = db.getPrimaryKey(req.params.id);
        const userInput = req.body;
        const {title, description} = userInput;

        const show = {
            title,
            description,
            episodes: []
        };

        db.getDb().collection(collections.shows).findOneAndUpdate(
            {_id: showId},
            {
                $set: show
            },
            {returnOriginal: false},
            (err, result) => {
                if (err) {
                    console.log('Some error occurred. ', err);
                } else {
                    console.log('No files attached');
                    const actions = {
                        type: 'update', ok: result.ok
                    };
                    res.json({actions});
                }
            }
        )
    },
};

module.exports = shows;

