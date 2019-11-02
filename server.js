const express = require('express');
const app = express();

const request = require('request');
const rp = require('request-promise');

const getNEO = (dateMin, dateMax, distMin, distMax, callback) => {
    const reqString = `https://ssd-api.jpl.nasa.gov/cad.api?\
date-min=${dateMin}&\
date-max=${dateMax}&\
dist-min=${distMin}&\
dist-max=${distMax}`;
    request(reqString, (err, res, body) => {
        if(!err && res.statusCode == 200) {
            var NEOs = parseNEO(body);

            let promises = [];
            NEOs.forEach((obj) => {
                promises.push(getNEODat(dateMin, dateMax, distMin, distMax, obj));
            });

            Promise.all(promises).then((vals) => {
                callback(vals.filter(x => x));
            });

        } else {
            callback(body);
        }
    });
}

const parseNEO = (body) => {
    let NEOs = [];
    JSON.parse(body).data.forEach((item) => {
        NEOs.push(item[0]);
    });
    return NEOs;
}

const getNEODat = (dateMin, dateMax, distMin, distMax, NEO) => {
    const reqString = `https://ssd-api.jpl.nasa.gov/sbdb.api?\
sstr=${NEO.replace(' ', '%20')}&\
ca-data=true`;
    return rp(reqString)
        .then((res) => {
            const body = JSON.parse(res);
            const ca_data = body.ca_data.filter(val => {
                return dateInRange(dateMin, dateMax, val.cd);
            });
            const ca = ca_data.map(val => {
                return {
                    date: val.cd,
                    dist: val.dist_min
                }
            });

            return {
                statusCode: 200,
                name: body.object.fullname,
                orbit: {
                    a: body.orbit.elements.find((item) => {
                        return item.name == 'a';
                    }).value,
                    e: body.orbit.elements.find((item) => {
                        return item.name == 'e';
                    }).value
                },
                ca_data: ca
            }
        })
        .catch((err) => {
            console.log(err.statusCode);
        });
}

const dateInRange = (dateMin, dateMax, date) => {
    dDateMin = new Date(dateMin);
    dDateMax = new Date(dateMax);
    dDate = new Date(date);
    return dDateMin < dDate && dDate < dDateMax;
}

app.get('/', (req, res) => {
    const dateMin = req.query.dateMin;
    const dateMax = req.query.dateMax;
    const distMin = req.query.distMin;
    const distMax = req.query.distMax;
    console.log(dateMin);
    console.log(dateMax);
    console.log(distMin);
    console.log(distMax);
    getNEO(dateMin, dateMax, distMin, distMax, (body) => {
        res.send(body);
    });
});

app.listen(8080, () => console.log('app listening on port 8080!'));
