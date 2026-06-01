const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.S3_URL),
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCCESS,
});

const bucket = process.env.S3_BUCKET;

function listPage(marker) {
  return new Promise((resolve, reject) => {
    const params = { Bucket: bucket, MaxKeys: 1000 };
    if (marker) params.Marker = marker;
    s3.listObjects(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

(async () => {
  let marker;
  let total = 0;
  let count = 0;
  const byPrefix = {};

  do {
    const page = await listPage(marker);
    const contents = page.Contents || [];
    for (const o of contents) {
      total += o.Size || 0;
      count++;
      const prefix = (o.Key || '').split('/')[0] || '(root)';
      if (!byPrefix[prefix]) byPrefix[prefix] = { bytes: 0, count: 0 };
      byPrefix[prefix].bytes += o.Size || 0;
      byPrefix[prefix].count++;
    }
    if (page.IsTruncated) {
      marker = page.NextMarker || (contents.length ? contents[contents.length - 1].Key : undefined);
    } else {
      marker = undefined;
    }
  } while (marker);

  const mb = total / 1048576;
  console.log(
    JSON.stringify(
      {
        bucket,
        objects: count,
        bytes: total,
        mb: +mb.toFixed(2),
        gb: +(total / 1073741824).toFixed(3),
        byTopPrefix: Object.fromEntries(
          Object.entries(byPrefix).map(([k, v]) => [
            k,
            { objects: v.count, mb: +(v.bytes / 1048576).toFixed(2) },
          ]),
        ),
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
