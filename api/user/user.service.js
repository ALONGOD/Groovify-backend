import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { reviewService } from '../review/review.service.js'
import { ObjectId } from 'mongodb'

export const userService = {
    add, // Create (Signup)
    getById, // Read (Profile page)
    update, // Update (Edit profile)
    remove, // Delete (remove user)
    query, // List (of users)
    getByUsername, // Used for Login
    AddStationToLiked,
    removeStationFromLiked,
    updateLikedStation
}

async function query(filterBy = {}) {
    const criteria = _buildCriteria(filterBy)
    try {
        const collection = await dbService.getCollection('user')
        var users = await collection.find(criteria).toArray()
        users = users.map(user => {
            delete user.password
            user.createdAt = user._id.getTimestamp()
            // Returning fake fresh data
            // user.createdAt = Date.now() - (1000 * 60 * 60 * 24 * 3) // 3 days ago
            return user
        })
        return users
    } catch (err) {
        logger.error('cannot find users', err)
        throw err
    }
}

async function getById(userId) {
    try {
        var criteria = { _id: ObjectId.createFromHexString(userId) }

        const collection = await dbService.getCollection('users')
        const user = await collection.findOne(criteria)
        delete user.password

        // criteria = { byUserId: userId }

        // user.givenReviews = await reviewService.query(criteria)
        // user.givenReviews = user.givenReviews.map(review => {
        //     delete review.byUser
        //     return review
        // })

        return user
    } catch (err) {
        logger.error(`while finding user by id: ${userId}`, err)
        throw err
    }
}

async function AddStationToLiked(userId, station) {
    const { name, createdBy, imgUrl, _id } = station
    const stationToSave = {
        id: _id,
        name,
        creator: {
            id: createdBy.id,
            username: createdBy.username,
        },
        imgUrl,
    }
    const criteria = { _id: ObjectId.createFromHexString(userId) }

    const collection = await dbService.getCollection('users')
    const results = await collection.updateOne(criteria, { $push: { likedStations: stationToSave } })
    console.log('results:', results)
    return stationToSave
}

async function updateLikedStation(userId, station) {
    const { name, createdBy, imgUrl, _id } = station
    const stationToSave = {
        id: _id,
        name,
        creator: {
            id: createdBy.id,
            username: createdBy.username,
        },
        imgUrl,
    }

    const criteria = { _id: ObjectId.createFromHexString(userId), 'likedStations.id': ObjectId.createFromHexString(_id) }

    const collection = await dbService.getCollection('users')
    
    const results = await collection.updateOne(
        criteria,
        { $set: { 'likedStations.$': stationToSave } }
    )
    console.log('results:', results)
    return stationToSave
}

async function removeStationFromLiked(userId, stationId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(userId) }
        console.log('criteria:', criteria)

        const collection = await dbService.getCollection('users')
        const results = await collection.updateOne(criteria, { $pull: { likedStations: { id: stationId } } })
        console.log('results:', results)
        return stationId
    } catch (err) {
        logger.error(`cannot remove station ${stationId}`, err)
        throw err
    }
}

async function getByUsername(username) {
    try {
        const collection = await dbService.getCollection('user')
        const user = await collection.findOne({ username })
        return user
    } catch (err) {
        logger.error(`while finding user by username: ${username}`, err)
        throw err
    }
}

async function remove(userId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(userId) }

        const collection = await dbService.getCollection('user')
        await collection.deleteOne(criteria)
    } catch (err) {
        logger.error(`cannot remove user ${userId}`, err)
        throw err
    }
}

async function update(user) {
    try {
        console.log('user:', user)
        const { _id, username, img: imgUrl, likedSongsStation, likedStations} = user
        const criteria = { _id: ObjectId.createFromHexString(_id) }
        // peek only updatable properties
        const userToSave = {
            _id: ObjectId.createFromHexString(_id), // needed for the returnd obj
            username,
            imgUrl,
            likedSongsStation,
            likedStations
        }
        
        
        const collection = await dbService.getCollection('users')
        console.log('collection:', collection)
        const result = await collection.updateOne( criteria , { $set: userToSave })
        console.log('result:', result)
        return userToSave
    } catch (err) {
        logger.error(`cannot update user ${user._id}`, err)
        throw err
    }
}

async function add(user) {
    try {
        // peek only updatable fields!
        const userToAdd = {
            username: user.username,
            password: user.password,
            fullname: user.fullname,
            imgUrl: user.imgUrl,
            isAdmin: user.isAdmin,
            score: 100,
        }
        const collection = await dbService.getCollection('user')
        await collection.insertOne(userToAdd)
        return userToAdd
    } catch (err) {
        logger.error('cannot add user', err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}
    if (filterBy.txt) {
        const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
        criteria.$or = [
            {
                username: txtCriteria,
            },
            {
                fullname: txtCriteria,
            },
        ]
    }
    if (filterBy.minBalance) {
        criteria.score = { $gte: filterBy.minBalance }
    }
    return criteria
}