# ActorExplorer
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.0.2.

## Tools
* MongoDB
* MongoDB-Tools, for restoring actor dataset dump
* NPM
* Angular CLI (npm install -g @angular/cli)

## Setup
1. Download repo and actor dataset.
2. Restore dataset in MongoDB. Use 'ActorExplorer' as database name - if you chose differently remember to change connection string in mongodb-proxy.js.
3. Restore npm packages (npm install).
4. Run the proxy server (node mongodb-proxy.js).
5. Run the angular server (ng serve).
6. To run both, with proxy in the backgroud use (node mongodb-proxy.js & ng serve) BUT you will have to kill the proxy on your own.
7. Changes in Angular are refresh when you save the file.
8. Changes in proxy are refreshed when you restart the app.

## Code scaffolding
Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build
Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Further help
To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
