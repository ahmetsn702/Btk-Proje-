// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";  
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";    
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";           
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title CategoryPoints1155
 * @notice ERC-1155 based Category Point (CP) token.
 *         Each category has its own token ID.
 *         Transfers are RESTRICTED: only mint, burn, and platform-internal
 *         routing between Exchange and TaskRewardManager are allowed.
 */
contract CategoryPoints1155 is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Exchange contract address — allowed as CP sender in internal routing
    address public exchange;

    /// @notice TaskRewardManager contract address — allowed as CP sender/receiver in internal routing
    address public taskRewardManager;

    event ExchangeSet(address indexed exchange);
    event TaskRewardManagerSet(address indexed taskRewardManager);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializer (replaces constructor for proxy pattern).
     * @param baseURI_ Base URI for token metadata (e.g., "https://api.example.com/metadata/").
     * @param admin_ Address that receives DEFAULT_ADMIN_ROLE.
     */
    function initialize(string calldata baseURI_, address admin_) external initializer {
        __ERC1155_init(baseURI_);
        __AccessControl_init();
        __Pausable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);
        _grantRole(PAUSER_ROLE, admin_);
    }

    /**
     * @notice Set the Exchange contract address.
     * @param exchange_ Address of the Exchange contract.
     */
    function setExchange(address exchange_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(exchange_ != address(0), "CP: zero address");
        exchange = exchange_;
        emit ExchangeSet(exchange_);
    }

    /**
     * @notice Set the TaskRewardManager contract address.
     * @param taskRewardManager_ Address of the TaskRewardManager contract.
     */
    function setTaskRewardManager(address taskRewardManager_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(taskRewardManager_ != address(0), "CP: zero address");
        taskRewardManager = taskRewardManager_;
        emit TaskRewardManagerSet(taskRewardManager_);
    }

    /**
     * @notice Mint CP tokens to a user.
     * @param to Recipient address.
     * @param categoryId Category token ID.
     * @param amount Amount to mint.
     */
    function mint(address to, uint256 categoryId, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        _mint(to, categoryId, amount, "");
    }

    /**
     * @notice Burn CP tokens from a user.
     * @param from Owner address whose tokens will be burned.
     * @param categoryId Category token ID.
     * @param amount Amount to burn.
     */
    function burn(address from, uint256 categoryId, uint256 amount) external onlyRole(BURNER_ROLE) whenNotPaused {
        _burn(from, categoryId, amount);
    }

    /**
     * @notice Batch mint CP tokens across multiple categories.
     * @param to Recipient address.
     * @param categoryIds Array of category token IDs.
     * @param amounts Array of amounts (same length as categoryIds).
     */
    function batchMint(
        address to,
        uint256[] calldata categoryIds,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(categoryIds.length == amounts.length, "CP: length mismatch");
        for (uint256 i = 0; i < categoryIds.length; ) {
            _mint(to, categoryIds[i], amounts[i], "");
            unchecked { ++i; }
        }
    }

    /**
     * @notice Pause all mint/burn/transfer operations.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause operations.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Update token balances hook (ERC-1155).
     *         Enforces the P2P transfer lock:
     *         - Mint (from == address(0)): always allowed.
     *         - Burn (to == address(0)): always allowed.
     *         - Internal routing between Exchange and TaskRewardManager: allowed.
     *         - All other transfers (including user-to-user): REVERTED.
     */
    function _update(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory values
) internal override {
    if (from != address(0) && to != address(0)) {
        bool isInternalRouting =
            (from == exchange && to == taskRewardManager) ||
            (from == taskRewardManager && to == exchange);
        require(isInternalRouting, "CP: P2P transfer disabled");
    }
    super._update(from, to, ids, values);
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
    ) public view override(ERC1155Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
