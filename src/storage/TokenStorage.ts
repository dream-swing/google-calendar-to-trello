export interface TokenStorage {
	storeSyncToken(syncToken: string);
	getSyncToken(callback: ((string) => void));
}

export class FakeTokenStorage implements TokenStorage {
	public storeSyncToken(syncToken: string) {
	}

	public getSyncToken(callback: ((string) => void)) {
		callback("faketoken");
	}
}