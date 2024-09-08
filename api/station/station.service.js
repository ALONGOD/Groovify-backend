import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { userService } from '../user/user.service.js'

const PAGE_SIZE = 3

export const stationService = {
  remove,
  query,
  getById,
  add,
  update,
  addStationMsg,
  removeStationMsg,
}

async function query(search = '') {
  try {
    const criteria = _buildCriteria(search)

    const collection = await dbService.getCollection('stations')
    var stationCursor = await collection.find(criteria)

    const stations = stationCursor.toArray()
    return stations
  } catch (err) {
    logger.error('cannot find stations', err)
    throw err
  }
}

async function getById(stationId) {

  try {
    const criteria = { _id: ObjectId.createFromHexString(stationId) }

    const collection = await dbService.getCollection('stations')
    const station = await collection.findOne(criteria)

    station.createdAt = station._id.getTimestamp()
    return station
  } catch (err) {
    logger.error(`while finding station ${stationId}`, err)
    throw err
  }
}

async function remove(stationId) {
  // const { loggedinUser } = asyncLocalStorage.getStore()
  // const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(stationId),
    }
    // if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('stations')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your station'
    return stationId
  } catch (err) {
    logger.error(`cannot remove station ${stationId}`, err)
    throw err
  }
}

async function add(station) {
  try {
  const stationToSave = {
    name: station.name,
    description: station.description,
    imgUrl: station.imgUrl,
    tags: station.tags,
    createdBy: 'logged in user',
    createdAt: Date.now(),
    likedByUsers: station.likedByUsers,
    songs: station.songs,
  }
    const collection = await dbService.getCollection('stations')
    await collection.insertOne(stationToSave)

    return station
  } catch (err) {
    logger.error('cannot insert station', err)
    throw err
  }
}

async function update(station) {
  const stationToSave = {
    name: station?.name,
    description: station?.description,
    imgUrl: station?.imgUrl,
    tags: station?.tags,
    createdBy: station?.createdBy,
    likedByUsers: station?.likedByUsers,
    songs: station?.songs,
  }

  try {
    const criteria = { _id: ObjectId.createFromHexString(station._id) }
    const collection = await dbService.getCollection('stations')
    await collection.updateOne(criteria, { $set: stationToSave })

    return station
  } catch (err) {
    logger.error(`cannot update station ${station._id}`, err)
    throw err
  }

}

async function addStationMsg(stationId, msg) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stationId) }
    msg.id = makeId()

    const collection = await dbService.getCollection('stations')
    await collection.updateOne(criteria, { $push: { msgs: msg } })

    return msg
  } catch (err) {
    logger.error(`cannot add station msg ${stationId}`, err)
    throw err
  }
}

async function removeStationMsg(stationId, msgId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stationId) }

    const collection = await dbService.getCollection('stations')
    await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

    return msgId
  } catch (err) {
    logger.error(`cannot add station msg ${stationId}`, err)
    throw err
  }
}

function _buildCriteria(search) {
  const criteria = {
    name: { $regex: search, $options: 'i' },
  }
  return criteria
}

function _buildSort(filterBy) {
  // if(!filterBy.sortField) return {}
  // return { [filterBy.sortField]: filterBy.sortDir }
  // if(!filterBy.sortField) return {}
  // return { [filterBy.sortField]: filterBy.sortDir }
}

