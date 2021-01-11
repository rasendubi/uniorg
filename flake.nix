{
  description = "Uniorg development flake.";

  inputs = {
    nixpkgs = {
      url="github:NixOS/nixpkgs/nixpkgs-unstable";
    };
  };

  outputs = { self, nixpkgs }: {
    devShell.x86_64-linux =
      let pkgs = nixpkgs.legacyPackages.x86_64-linux;
      in pkgs.mkShell {
        nativeBuildInputs = [
          pkgs.nodejs-14_x
        ];
      };

  };
}
