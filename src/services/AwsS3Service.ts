import * as aws from "aws-sdk";

const BUCKET_NAME = "dream-swing-automation-scripts";
const SYNC_TOKEN_NAME = "google-calendar-sync-token";

// credentials stored locally in ~/.aws/credentials
let s3 = new aws.S3();

export let storeSyncToken = (syncToken: string) => {
	storeData(SYNC_TOKEN_NAME, syncToken, "text/plain", /*encrypt*/false);
}

export let getSyncToken = (callback) => {
	getData(SYNC_TOKEN_NAME, (dataBody) => {
		let token = dataBody.toString();
		console.log("token from storage: " + token);
		callback(token);
	});
}

export let storeEncryptedAuth = (key: string, authData: any) => {
	storeData(key, authData, "application/json", /*encrypt*/true);
}

export let getEncryptedAuth = (key: string, callback) => {
	getData(key, (dataBody) => {
		let jsonAuth = JSON.parse(dataBody.toString());
		callback(jsonAuth);
	});
}

let storeData = (key: string, bodyContent, contentType: string, encrypt: boolean) => {
	ensureBucketExist();

	s3.waitFor("bucketExists", { Bucket: BUCKET_NAME }, (err, data) => {
		if (typeof bodyContent !== "string") {
			bodyContent = JSON.stringify(bodyContent);
		}

		let putParams = {
			Bucket: BUCKET_NAME,
			Key: key,
			Body: bodyContent,
			ContentType: contentType
		};
		if (encrypt) {
			putParams["ServerSideEncryption"] = "AES256";
		}
		s3.putObject(putParams, (err, data) => {
			if (err) {
				throw new Error(`Storing data to key ${key} failed. ${err}`);
			}

			console.log(`${key} data stored successfully. ETag: ${data.ETag}`);
		});
	});
}

let getData = (key: string, callback) => {
	bucketExist((doesExist) => {
		if (!doesExist) {
			throw new Error("Bucket does not exist, can't retrieve data.");
		}

		let getParams = {
			Bucket: BUCKET_NAME,
			Key: key
		};
		s3.getObject(getParams, (err, data) => {
			if (err) {
				throw new Error(`Could not retrieve data for ${key}. ${err}`);
			}
			callback(data.Body);
		});
	});
}

let ensureBucketExist = () => {
	bucketExist((doesExist) => {
		if (!doesExist) {
			let createParams = {
				Bucket: BUCKET_NAME,
				CreateBucketConfiguration: {
					LocationConstraint: "us-east-1"
				}
			}
			s3.createBucket(createParams, (err, data) => {
				if (err) {
					throw new Error("Error creating S3 bucket. " + err);
				}

				console.log(`Bucket ${BUCKET_NAME} created in location: ${data.Location}`);
			});
		}
	});
}

let bucketExist = (callback) => {
	s3.headBucket({ Bucket: BUCKET_NAME }, (err, data) => {
		if (err) {
			console.log("headBucket returned error. " + err);
			callback(false);
		} else {
			callback(true);
		}
	})
}











