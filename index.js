const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const AWS = require('aws-sdk');
const PACKAGE = require('./package.json');

const INST = process.env["INSTANCE_ID"];

if (!INST) {
    throw new Error("No instance ID. Abort!");
}

const ec2 = new AWS.EC2({ region: "us-west-2" });

app.use(cors());
app.use(bodyParser.json({ type: 'application/json' }));

app.get('/instance', (req, res) => {

    ec2.describeInstances({ InstanceIds: [ INST ] })
        .promise()
        .then((dat) => {
            const instance = dat.Reservations[0].Instances[0];
            res.send({
                dnsName: instance.PublicDnsName,
                ipAddr: instance.PublicIpAddress,
                status: instance.State.Name,
            });
        })
        .catch((err) => {
            console.error(err);
            res.send({
                status: "unkonwn"
            });
        });
});

app.post('/instance', (req, res) => {
    const reqStatus = req.body.status;

    if (!reqStatus) {
        return res.send({ message: "Missing required argument: status" }, 400);
    }

    switch (reqStatus) {
        case "stopped":
            stopInst(res);
            break;
        case "running":
            startInst(res);
            break;
        default:
            res.send({ message: "Unknown request state. Expected one of: stopped, running" }, 400);
            break;
    }
});

function startInst(res) {
    ec2.startInstances({ InstanceIds: [ INST ] }).promise()
        .then((d) => res.send({ status: d.StartingInstances[0].CurrentState.Name }))
        .catch((e) => res.send(e, 500));
}

function stopInst(res) {
    ec2.stopInstances({ InstanceIds: [ INST ] }).promise()
        .then((d) => res.send({ status: d.StoppingInstances[0].CurrentState.Name }))
        .catch((e) => res.send(e, 500));
}

app.listen(3000, () => console.log('Example app listening on port 3000!'));

console.log(`Instance ID: ${process.env["INSTANCE_ID"]}`);
console.log(`Using AWS Profile: ${process.env["AWS_PROFILE"] || "DEFAULT"}`);
