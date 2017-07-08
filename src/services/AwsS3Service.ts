import * as aws from "aws-sdk";

const BUCKET_NAME = "dream-swing-automation-scripts";
const SYNC_TOKEN_NAME = "google-calendar-sync-token";

// credentials stored locally in ~/.aws/credentials
let s3 = new aws.S3();

export let storeSyncToken = (syncToken: string) => {
	ensureBucketExist();

	s3.waitFor("bucketExists", { Bucket: BUCKET_NAME }, (err, data) => {
		let putParams = {
			Bucket: BUCKET_NAME,
			Key: SYNC_TOKEN_NAME,
			Body: syncToken
		};
		s3.putObject(putParams, (err, data) => {
			if (err) {
				console.error("Storing sync token failed. " + err);
				return;
			}

			console.log("Sync token stored successfully. ETag: " + data.ETag);
		});
	});
}

export let getSyncToken = (callback) => {
	bucketExist((doesExist) => {
		if (!doesExist) {
			console.error("Bucket does not exist, can't retrieve sync token.");
			return;
		}

		let getParams = {
			Bucket: BUCKET_NAME,
			Key: SYNC_TOKEN_NAME
		};
		s3.getObject(getParams, (err, data) => {
			if (err) {
				console.error("Could not get sync token. " + err);
				return;
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
					console.error("Error creating S3 bucket. " + err);
					return;
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
			console.log(`Bucket ${BUCKET_NAME} exists.`);
			callback(true);
		}
	})
}











