#!/bin/bash
TOKEN=$(node /Users/dohyeopsong/service/genjwt.js)
curl -s -m 5 "http://localhost:8080/jwt?token=$TOKEN&secret=topsecret"; echo
curl -s -m 5 "http://localhost:8080/jwt?token=$TOKEN&secret=wrong"; echo
