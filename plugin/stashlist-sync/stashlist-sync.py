import stashapi.log as log
from stashapi.stashapp import StashInterface
import sys
import requests
import json

from config import stashlist_apikey, stashlist_endpoint

request_s = requests.Session()
request_s.headers.update({"ApiKey": stashlist_apikey})

def processScene(s):
    if len(s['stash_ids']) == 0:
        log.debug('no scenes to process')
        return
    for sid in s['stash_ids']:
        # post to api
        res = request_s.post(stashlist_endpoint + "/api/list/add/history" + "?stashid=" + sid['stash_id'])
        if res.status_code != 200:
            log.error('failed to submit scene')
            log.error(res.text)
            return

def syncall():
    scenes=stash.find_scenes(f={"stash_id_endpoint":{"modifier":"NOT_NULL"}},filter={"per_page": -1})
    count = len(scenes)
    log.info(str(count)+' scenes to sync.')
    ids = []
    for scene in scenes:
        for sid in scene['stash_ids']:
            ids.append(sid['stash_id'])
    # bulk submit
    data = {"stashids": ids, "type": "history"}
    res = request_s.post(stashlist_endpoint + '/api/list/add/bulk', json=data)
    if res.status_code != 200:
        log.error('bulk submit failed')
        log.error(res.text)
        return

json_input = json.loads(sys.stdin.read())
FRAGMENT_SERVER = json_input["server_connection"]
stash = StashInterface(FRAGMENT_SERVER)

if 'mode' in json_input['args']:
    PLUGIN_ARGS = json_input['args']["mode"]
    if 'syncall' in PLUGIN_ARGS:
        syncall()
elif 'hookContext' in json_input['args']:
    id=json_input['args']['hookContext']['id']
    scene=stash.find_scene(id)
    log.info('adding history for scene: ' + id)
    processScene(scene)