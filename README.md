# LedgRX
End-to-end visibility into the manufacturing and distribution processes of all pharmaceutical medications.

## Running project locally

This repo's runnable stack lives under `blockchain`. It uses Docker Compose and a local Hyperledger Fabric test network.

Prereqs:
- Docker + Docker Compose
- Bash (macOS/Linux or WSL)

Start:
```bash
cd blockchain
chmod +x up.sh down.sh
./up.sh
```

App endpoints:
- Frontend: http://localhost:3000
- API: http://localhost:3001

Stop:
```bash
cd blockchain
./down.sh
```

## Mobile app (React Native)

Prereqs:
- Node.js 20+
- Xcode (iOS) or Android Studio (Android)

iOS simulator:
```bash
cd mobile-app
npm install
cd ios && pod install && cd ..
npm run ios
```

Android emulator:
```bash
cd mobile-app
npm install
npm run android
```

Physical device (camera testing):
1) Ensure your phone and dev machine are on the same Wi‑Fi.
2) Update `API_BASE_URL` in `mobile-app/App.tsx` to use your machine’s LAN IP (e.g. `http://192.168.1.20:3001`).
3) iOS: run `npm run ios -- --device "<Your iPhone Name>"`.
4) Android: enable USB debugging, then run `npm run android`.

## Commit types

- `CHORE:` General maintenance  
  - `CHORE: clean up unused assets`

- `DEPS:` Dependency updates (npm/yarn)  
  - `DEPS: update react-native to 0.73.0`

- `IOS:` CocoaPods or iOS build-related changes  
  - `IOS: run pod install after dependency change`

- `FEAT:` New features  
  - `FEAT: add biometric login`

- `FIX:` Bug fixes  
  - `FIX: resolve Android crash on startup`

- `UI:` UI updates  
  - `UI: update button styles`

- `REFACTOR:` Code refactoring  
  - `REFACTOR: simplify navigation logic`

- `TEST:` Adding or updating tests  
  - `TEST: add unit tests for auth module`
 
## Branch types

Use clear, consistent naming for all branches:

- `feature/` — for new features
  - `feature/user-authentication`, `feature/JIRA-123-add-profile`

- `bugfix/` — for fixing bugs  
  - `bugfix/login-error`, `bugfix/resolve-crash`

- `hotfix/` — for urgent production fixes  
  - `hotfix/security-patch`

- `refactor/`, `docs/`, `test/`, `chore/` — for respective tasks  
  - `refactor/db-query`, `docs/api-guide`, `test/e2e-login`, `chore/update-deps`


# Project title: 
Blockchain pharmaceutical management system (LedgRX)

## Supervisor: 
Ji-Jian Chin

## Link to version-contorlled repository: 
https://github.com/ChristopherJamesMoore/comp-3000-repository

## Program enrollment:
BSc Computer Science

## Keywords
Blockchain, Medication, Pharmaceutical, Mobile application, Web application, Hyperledger Fabric

## Project vision
This system is intended to be used by stakeholders such as patients, general practitioners, pharmacists, distributors, and manufactures. The problem I aim to solve is the issue with transparency and trust in the UKs pharmaceutical supply. Creating transparency in this area will reduce the risk of counterfeit medication entering the mainstream distribution pipeline. The LedgRX blockchain pharmaceutical management system is a end-to-end tracking system for the monitoring of the manufacturing and distribution of prescription medication. It implements a hybrid storage architecture to ensure data protection is kept inline with GDPR whilst allowing good scalability for the system.

## Risk plan
There are a number of risks that are associated with the development of a system such as this one, as well as risks that can arise during the design & development of the system. I will outline these risks as well as give them a score from 1-5 based on level of impact to the project.

 1. Ambitious scope

Due to the complexity of some of the features of this system the ~9 month timeline may be insufficient and leave the system incomplete. Some of the complex features include Hyperledger fabric implementation, the hybrid storage system with IPFS as well as a back-end database, and the creation of a RESTful API. I rate the potential impact of this risk: 5. This is because the incompletion of the system will result in it being unusable as all features are critical to the functionality of the system as a whole.

One way to mitigate this risk would be to focus the first sprints on getting an MVP working with all of the core features. Focusing on getting the blockchain tracking system to work before focusing on other features such as role-based user access and both a mobile and web application will ensure project success.

 2. Competing module and work commitments

With other university modules and part-time work also being large time commitments there is a possibility of reduction in amount of time I am able to give to this project. This could lead to an unpolished system or even failure to implement the core features. I rate the potential impact of this risk: 4. This is because the loss of time from other commitments will reduce the quality of development of the system. 

To mitigate this risk, time management and a solid Gantt chart will allow me to set time aside specifically for this project, as well as focusing on an MVP same as the last risk.

 3. Limited computing resources

Developing and testing on a single personal machine may cause a hardware bottleneck with my laptop not being able to keep up with the workflow. I rate the impact of this risk: 3. This is because whilst this risk can cause slow development cycles, the porject will still make progress. Additionally there are plenty of ways to prevent this risk. 

One such way is to use lightweight testing frameworks so as to not overload my personal machine. Another way to mitigate the risk is to reduce the blockchain network size for local testing and use simulation instead of full deployment.

 4. Pharma knowledge gap

My lack of industry knowledge can lead to critical design flaws in the supply chain system or data storage architecture. I rate the impact of this risk: 3. This is because the lack of knowledge in the field can cause delay in development or incorrect data.

A mitigation for this would be to talk to professionals and do due diligence research into the subject.

## LSEP constraints
The implementation of a blockchain-based pharmaceutical tracking system raises significant legal and ethical considerations, primarily concerning data protection and regulatory compliance. The General Data Protection Regulation (GDPR) presents a fundamental challenge due to the apparent conflict between blockchain's immutability and GDPR's requirement for data erasure under the "right to be forgotten." The hybrid storage architecture proposed in this project addresses this by storing only cryptographic hashes on the immutable blockchain while maintaining deletable personal data off-chain. The system must also comply with the Medicines and Healthcare products Regulatory Agency (MHRA) regulations and the Falsified Medicines Directive (FMD), which mandates specific safety features for medication packaging and serialisation requirements. Professional responsibilities as a software developer in the healthcare domain require adherence to the British Computer Society (BCS) Code of Conduct, emphasisng public interest and duty of care when developing systems that impact public health. The project must be clearly positioned as a proof-of-concept research prototype rather than a production-ready system, with transparent documentation of system limitations and security considerations.

Ethical considerations extend beyond legal compliance to encompass privacy, consent, and equity within healthcare systems. Patients have a reasonable expectation of privacy regarding their medical information, and while tracking batch-level information may not directly identify individuals, careful consideration must be given to what information is truly necessary for counterfeit prevention.

**Deliverables:**
- Complete dissertation document
- User documentation
- Technical documentation
- Final presentation
- Source code repository
