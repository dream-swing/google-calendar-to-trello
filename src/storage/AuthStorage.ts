export interface AuthStorage {
	getEncryptedAuth(key: string, callback: ((string) => void));
	storeEncryptedAuth(key: string, authData: any);
}

export class FakeAuthStorage implements AuthStorage {
	public getEncryptedAuth(key: string, callback: ((string) => void)) {
		callback("");
	}

	public storeEncryptedAuth(key: string, authData: any) {
	}
}