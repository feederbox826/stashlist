import sys
import json

json_input = json.loads(sys.stdin.read())

# early exit
if 'hookContext' in json_input['args'] and 'stash_ids' in json_input['args']['hookContext']['input']:
    stashids = json_input['args']['hookContext']['input']['stash_ids']
    if not stashids:
        exit(0)

import requests
import stashapi.log as log
from stashapi.stashapp import StashInterface

request_s = requests.Session()
stashlist_endpoint = "https://list.feederbox.cc"

def historyScene(stashids):
    for sid in stashids:
        # post to api
        res = request_s.post(stashlist_endpoint + "/api/list/add/history" + "?stashid=" + sid['stash_id'])
        if res.status_code != 200:
            log.error('failed to submit scene')
            log.error(res.text)
            return

def syncall():
    sqlScenes = stash.sql_query(sql="SELECT stash_id FROM scene_stash_ids")
    # https://stackoverflow.com/a/952952
    scenes = [
        x
        for xs in sqlScenes['rows']
        for x in xs
    ]
    log.info(str(len(scenes))+' scenes to sync.')
    # bulk submit
    data = {"stashids": scenes, "type": "history"}
    res = request_s.post(stashlist_endpoint + '/api/list/add/bulk', json=data)
    if res.status_code != 200:
        log.error('bulk submit failed')
        log.error(res.text)
        return

FRAGMENT_SERVER = json_input["server_connection"]
stash = StashInterface(FRAGMENT_SERVER)
config = stash.get_configuration()
apikey = config["plugins"]["stashlist-sync"]["stashlist_apikey"]
if not apikey:
    log.error('No API key found')
    exit(1)
request_s.headers.update({"ApiKey": apikey})

if 'hookContext' in json_input['args']:
    log.debug('adding history for scene: ' + str(id))
    historyScene(stashids)
elif 'mode' in json_input['args']:
    PLUGIN_ARGS = json_input['args']["mode"]
    if 'syncall' in PLUGIN_ARGS:
        syncall()