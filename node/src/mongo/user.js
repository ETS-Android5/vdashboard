const db = require('../config/mongo');
const md5 = require('md5');

const constants = require('../config/constants');

db.connect(err => {
    if (err) {
        console.log('Cannot connect to database');
        process.exit(1);
    } else {
        console.log('Connected to db');
    }
});

const users = {
    get: (req, res) => {

        console.log('GET /api/v1/users ', req.params, req.body);

        if (req.params.id) {

            if (!req.headers.authorization) {
                const auth = {
                    authenticated: false,
                };
                console.log('Login :', auth);
                res.json(auth);
                return false;
            }

            const base64Credentials = req.headers.authorization.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
            let [username, password] = credentials.split(':');
            console.log('credentials', credentials);
            let filter = password && password.length > 0  ? {username, password: md5(password)} : {email: username};
            db.getDb().collection(constants.mongo.collections.users).find(filter).toArray((err, users) => {
                if (err) {
                    console.log(err);
                } else {
                    const auth = {
                        authenticated: false,
                        username: username,
                        _id: users && Array.isArray(users) && users.length > 0 ? users[0]._id : '',
                        filter: JSON.stringify(filter)
                    };
                    if (users.length > 0 || filter.email) {
                        auth.authenticated = true;
                    }
                    const data = {
                        actions: {type: 'login', ok: 1},
                        form: auth
                    };

                    //console.log('Headers: ', req.headers);
                    console.log('Login: ', data);
                    res.json(data);
                }
            });
        } else {

            db.getDb().collection(constants.mongo.collections.users).find({}).toArray((err, users) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Users: ', Array.isArray(users), users.length);
                    res.status(200);

                    const data = {
                        actions: {type: 'read', ok: 1},
                        list: users
                    };
                    res.json(data);
                }
            });
        }
    },
    loginWithId: (req, res) => {
        console.log('GET /api/v1/login-with-id ', req.params, req.body);

        if (req.params.id) {
            const user = {
                email: req.params.id,
                username: null,
                password: null,
                admin: 0,
                subscriptions: []
            };

            db.getDb().collection(constants.mongo.collections.users).findOneAndUpdate(
                {email: req.params.id},
                {
                    $set: user
                },
                {returnOriginal: true, upsert: true},
                (err, users) => {
                    if (err) {
                        console.log('Some error occurred. ', err);
                    } else {
                        let _id = users && users.value && users.value._id ? users.value._id : '';
                        _id = users && users.lastErrorObject && users.lastErrorObject.upserted ? users.lastErrorObject.upserted : _id;

                        const auth = {
                            authenticated: true,
                            username: 'na',
                            //_id: users.value._id,
                            _id: _id
                        };

                        const data = {
                            actions: {type: 'login', ok: 1},
                            form: auth
                        };
                        res.json({data});
                    }
                }
            );
        }
    },
    post: (req, res) => {
        console.log('POST /api/v1/logins', req.body);
        const {email, username, password} = req.body;

        if (!email || !username || !password) {
            return res.json({email: 'Email, username, password is required'});
        }
        const user = {
            email,
            username,
            password: md5(password),
            admin: 0
        };

        db.getDb().collection(constants.mongo.collections.users).insertOne(user, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                const data = {
                    actions: {type: 'create', ok: result.result.ok},
                    form: {_id: result.insertedId, ...user},
                };
                res.json(data);
            }
        });
    },
    delete: (req, res) => {
        console.log('DELETE /api/v1/logins/:id ' + req.params.id);
        const userId = db.getPrimaryKey(req.params.id);
        db.getDb().collection(constants.mongo.collections.users).findOneAndDelete(
            {_id: userId},
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
    update:(req,res) => {
        console.log('PUT /api/v1/logins/:id', req.body);
        const userId = db.getPrimaryKey(req.params.id);
        const userInput = req.body;
        const {email, username, password, admin, subscription, unsubscribe} = userInput;

        console.log('unsubscribe: ', unsubscribe, unsubscribe=='true');
        if(subscription) {
            if(unsubscribe==='true') {
                console.log('unsubscribe is not equal to true: ');
                users._removeFromSet(userId, subscription, res);
            } else {
                console.log('unsubscribe is  equal to true: ');

                users._addToSet(userId, subscription, res);
            }
            return true;
        }

        console.log('out of unsubscribe is not equal to true: ', unsubscribe==true);

        let user = {
            email,
            username,
            password: md5(password),
            admin
        };

        db.getDb().collection(constants.mongo.collections.users).findOneAndUpdate(
            {_id: userId},
            {
                $set: user
            },
            {returnOriginal: false},
            (err, result) => {
                if (err) {
                    console.log('Some error occurred. ', err);
                } else {
                    const actions = {
                        type: 'update', ok: result.ok
                    };
                    res.json({actions});
                }
            }
        )
    },
    _addToSet: (userId, subscription, res) => {
        db.getDb().collection(constants.mongo.collections.users).findOneAndUpdate(
            {_id: userId},
            {$addToSet: {subscriptions: subscription}},
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
                    res.json({actions});
                }
            }
        );
    },
    _removeFromSet: (userId, subscription_id, res) => {
        db.getDb().collection(constants.mongo.collections.users).findOneAndUpdate(
            {_id: userId},
            {$pull: {subscriptions: subscription_id}},
            {returnOriginal: false, upsert: false},
            (err, result) => {
                if (err) {
                    console.log('Some error occurred. ', err);
                } else {
                    console.log('Subscription removed', subscription_id, result);
                    const actions = {
                        type: 'update',
                        ok: result.ok
                    };
                    res.json({actions});
                }
            }
        );
    },

};

module.exports = users;
