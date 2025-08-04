import { Logger, WhisperOptions } from './types'
import { executeCppCommand } from './whisper'
import fs from 'fs'
import { constructCommand } from './WhisperHelper'
import { checkIfFileExists, convertToWavType } from './utils'
import autoDownloadModel from './autoDownloadModel'

export interface IOptions {
	modelName: string
	autoDownloadModelName?: string
	whisperOptions?: WhisperOptions
	withCuda?: boolean
	removeWavFileAfterTranscription?: boolean
	logger?: Logger | null
}

const noLogger = {
	debug: () => {},
	error: () => {},
	log: () => {},
}

export async function nodewhisper(filePath: string, options: IOptions) {
	const { removeWavFileAfterTranscription = false } = options
	const logger = options.logger === undefined ? console : options.logger === null ? noLogger : options.logger

	try {
		if (options.autoDownloadModelName) {
			logger.debug(`[Whisper-node] Checking and downloading model if needed: ${options.autoDownloadModelName}`)

			logger.debug('autoDownloadModelName', options.autoDownloadModelName)
			logger.debug('options', options)

			await autoDownloadModel(logger, options.autoDownloadModelName, options.withCuda)
		}

		logger.debug(`[Whisper-node] Checking file existence: ${filePath}`)
		checkIfFileExists(filePath)

		logger.debug(`[Whisper-node] Converting file to WAV format: ${filePath}`)
		const outputFilePath = await convertToWavType(filePath, logger)

		logger.debug(`[Whisper-node] Constructing command for file: ${outputFilePath}`)
		const command = constructCommand(outputFilePath, options)

		logger.debug(`[Whisper-node] Executing command: ${command}`)
		const transcript = await executeCppCommand(command, logger, options.withCuda)

		if (!transcript) {
			throw new Error('Transcription failed or produced no output.')
		}

		if (removeWavFileAfterTranscription && fs.existsSync(outputFilePath)) {
			logger.debug(`[Whisper-node] Removing temporary WAV file: ${outputFilePath}`)
			fs.unlinkSync(outputFilePath)
		}

		return transcript
	} catch (error) {
		logger.error(`[Whisper-node] Error during processing: ${error.message}`)
		throw new Error(`Operation failed: ${error.message}`)
	}
}
