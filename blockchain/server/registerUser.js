'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        const isDocker = fs.existsSync('/.dockerenv') || process.env.IN_DOCKER === 'true';

        if (isDocker) {
            if (ccp.certificateAuthorities?.['ca.org1.example.com']) {
                ccp.certificateAuthorities['ca.org1.example.com'].url = 'https://ca_org1:7054';
            }
        }

        // Create a new CA client for interacting with the CA.
        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const caTLSCACerts = ccp.certificateAuthorities['ca.org1.example.com'].tlsCACerts.pem;
        const ca = new FabricCAServices(caURL, { trustedRoots: caTLSCACerts, verify: false });

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user.
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
        } else {
            // Enroll the admin user, and import the new identity into the wallet.
            const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            await wallet.put('admin', x509Identity);
            console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
        }

        // Register the user, enroll the user, and import the new identity into the wallet.
        const adminIdentityForRegister = await wallet.get('admin');
        const provider = wallet.getProviderRegistry().getProvider(adminIdentityForRegister.type);
        const adminUser = await provider.getUserContext(adminIdentityForRegister, 'admin');
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client' // Changed role to admin
        }, adminUser);
        const userEnrollment = await ca.enroll({
            enrollmentID: 'appUser',
            enrollmentSecret: secret
        });
        const userX509Identity = {
            credentials: {
                certificate: userEnrollment.certificate,
                privateKey: userEnrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('appUser', userX509Identity);
        console.log('Successfully registered and enrolled user "appUser" with admin role and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to register user: ${error}`);
        process.exit(1);
    }
}

main();
