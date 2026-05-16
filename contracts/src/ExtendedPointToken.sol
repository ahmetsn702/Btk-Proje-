// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ExtendedPointToken
 * @notice ERC-20 XP token — base parity of the AMM pool.
 *         Total fixed supply of 10,000,000 XP minted to Exchange on genesis.
 *         After genesis, only Exchange can mint/burn.
 */
contract ExtendedPointToken is
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Genesis supply: 10,000,000 XP with 18 decimals.
    uint256 public constant GENESIS_SUPPLY = 10_000_000 * 10 ** 18;

    /// @notice Tracks whether genesis mint has already occurred.
    bool public genesisMinted;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializer.
     * @param admin_ Address that receives DEFAULT_ADMIN_ROLE and UPGRADER_ROLE.
     */
    function initialize(address admin_) external initializer {
        __ERC20_init("Extended Point", "XP");
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);
    }

    /**
     * @notice Perform the one-time genesis mint to the Exchange contract.
     *         Can only be called once, by an account with DEFAULT_ADMIN_ROLE.
     * @param exchange_ Address of the Exchange contract (recipient of genesis supply).
     */
    function genesisMint(address exchange_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!genesisMinted, "XP: genesis already minted");
        require(exchange_ != address(0), "XP: zero address");
        genesisMinted = true;
        _mint(exchange_, GENESIS_SUPPLY);
    }

    /**
     * @notice Mint XP tokens. Only callable by accounts with MINTER_ROLE.
     * @param to Recipient address.
     * @param amount Amount to mint.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @notice Burn XP tokens from an address. Only callable by accounts with BURNER_ROLE.
     * @param from Owner address whose tokens will be burned.
     * @param amount Amount to burn.
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    /**
     * @notice UUPS upgrade authorization.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @notice Check supported interfaces.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
