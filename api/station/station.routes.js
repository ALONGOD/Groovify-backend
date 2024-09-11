import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import { getStations, getStationById, addStation, updateStation, removeStation, addStationMsg, removeStationMsg, getStationByUser } from './station.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getStations)
router.get('/search/:search', log, getStations)
router.get('/:stationId', log, getStationById)
router.get('/user/:userId', log, getStationByUser)
router.post('/', log, requireAuth, addStation)
router.put('/:id', requireAuth, updateStation)
router.delete('/:stationId', requireAuth, removeStation)

router.post('/:id/msg', requireAuth, addStationMsg)
router.delete('/:id/msg/:msgId', requireAuth, removeStationMsg)

export const stationRoutes = router