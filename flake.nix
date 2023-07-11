{
  description = "Uniorg development flake.";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            nodejs-18_x
            nodePackages.pnpm
            turbo
          ];

          shellHook = ''
            export PATH="$PWD/node_modules/.bin/:$PATH"
            export TURBO_BINARY_PATH="${pkgs.turbo}/bin/turbo"
          '';
        };
      });

}
