#!/usr/bin/env node
import 'source-map-support/register';

import {runApp} from '../..';
import {join} from 'path';

runApp(require(join(process.cwd(), process.argv[2] || 'dist/app.js')).project);