require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const AWS = require('aws-sdk');

async function main() {
  const s3 = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCCESS,
    region: 'ap-southeast-2',
  });
  const bucket = process.env.S3_BUCKET;
  let total = 0;
  let token;
  do {
    const res = await s3
      .listObjectsV2({ Bucket: bucket, Prefix: 'report_', ContinuationToken: token })
      .promise();
    total += (res.Contents || []).filter((o) => /\.pdf$/i.test(o.Key)).length;
    token = res.NextContinuationToken;
  } while (token);
  console.log('S3 report_*.pdf objects:', total);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
