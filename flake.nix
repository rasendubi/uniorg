{
  description = "Uniorg development flake.";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";
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
          ]
          # turbo seems to be broken on macOS, so only add it on non-macOS
          ++ nixpkgs.lib.optional (!pkgs.stdenv.isDarwin) pkgs.turbo;

          TURBO_BINARY_PATH = if !pkgs.stdenv.isDarwin then "${pkgs.turbo}/bin/turbo" else "";
        };
      });

}
