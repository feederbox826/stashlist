import sys
import json

json_input = json.loads(sys.stdin.read())

# custom logger
def logger(origin, msg, level='info'):
    print(f"\001{level[0]}\002{origin}: {msg}", file=sys.stderr)

def log(msg, level='info'):
    logger("stashlist-sync", msg, level)

# recursive extraction
def extract(dict, keys):
    for key in keys:
        if dict is None:
            return None
        dict = dict.get(key, {})
    return dict

MODE = extract(json_input, ['args', 'mode'])

stashids = extract(json_input, ['args', 'hookContext', 'input', 'stash_ids'])
if not stashids and not MODE:
    log('No stash_ids found in hookContext', 'error')
    print("{}")
    exit(0)


import requests
from stashapi.stashapp import StashInterface
from stashapi.stashbox import StashBoxInterface

request_s = requests.Session()
stashlist_endpoint = "https://list.feederbox.cc"
STASHDB_ENDPOINT = "https://stashdb.org/graphql"

def historyScene(stashids):
    for sid in stashids:
        # post to api
        res = request_s.post(stashlist_endpoint + "/api/list/add/history" + "?stashid=" + sid['stash_id'])
        if res.status_code != 200:
            log('failed to submit scene', 'error')
            log(res.text, 'error')
            return

def bulk_submit(fingerprints: list[str]):
    data = {"stashids": fingerprints, "type": "history"}
    res = request_s.post(stashlist_endpoint + '/api/list/add/bulk', json=data)
    if res.status_code != 200:
        log('bulk submit failed', 'error')
        log(res.text, 'error')
        return
    log('bulk submit successful', 'info')

def syncall():
    sqlScenes = stash.sql_query(sql="SELECT stash_id FROM scene_stash_ids")
    # https://stackoverflow.com/a/952952
    scenes = [
        x
        for xs in sqlScenes['rows']
        for x in xs
    ]
    log(str(len(scenes))+' scenes to sync.')
    bulk_submit(scenes)

def sync_stashdb():
    # grabs fingerprints from stashdb and syncs them into stashlist
    # grab apikey from stashdb config
    stashbox_config = stash.get_stashbox_connection(STASHDB_ENDPOINT)
    stashdb = StashBoxInterface(stashbox_config)
    matches = stashdb.find_scenes(scene_query={"has_fingerprint_submissions": True, "sort": "CREATED_AT"}, fragment="id")
    stashids = [str(match['id']) for match in matches]
    log(f'Found {len(stashids)} scenes with fingerprint submissions in StashDB', 'info')
    bulk_submit(stashids)

FRAGMENT_SERVER = json_input["server_connection"]
stash = StashInterface(FRAGMENT_SERVER)
config = stash.get_configuration()
apikey = config["plugins"]["stashlist-sync"]["stashlist_apikey"]
if not apikey:
    log('No API key found', 'error')
    exit(1)
request_s.headers.update({"ApiKey": apikey})

if 'hookContext' in json_input['args']:
    log('adding history for scene: ' + str(id), 'debug')
    historyScene(stashids)
elif 'mode' in json_input['args']:
    PLUGIN_ARGS = json_input['args']["mode"]
    if 'syncall' in PLUGIN_ARGS:
        syncall()
    elif 'sync_stashdb' in PLUGIN_ARGS:
        sync_stashdb()
print("{}")